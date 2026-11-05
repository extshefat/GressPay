<?php
declare(strict_types=1);

final class GpAuth
{
    /** @return array{merchant_id:string,brand_id:string,email:string,mode:string,auth:string,scopes:list<string>}|null */
    public static function resolveActor(GpRequest $req): ?array
    {
        $bearer = $req->bearer();
        if ($bearer !== null && $bearer !== '' && !str_starts_with($bearer, 'gp_live_') && !str_starts_with($bearer, 'gp_test_')) {
            $payload = GpJwt::decode($bearer);
            if ($payload === null) {
                return null;
            }
            $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ? AND status = ?', [
                $payload['sub'] ?? '',
                'active',
            ]);
            if ($merchant === null || !self::tokenCurrent($payload, $merchant)) {
                return null;
            }
            $email = strtolower(trim((string) ($merchant['email'] ?? '')));
            $isAdmin = GpConfig::isAdmin($email) || (!empty($merchant['email_verified']) && ($merchant['role'] ?? '') === 'admin');
            if ($isAdmin && (($merchant['role'] ?? '') !== 'admin' || ($merchant['plan_id'] ?? '') !== 'lifetime')) {
                GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$merchant['merchant_id']]);
                $merchant['role'] = 'admin';
                $merchant['plan_id'] = 'lifetime';
            }
            $mode = self::jwtLedgerMode($req);
            $actor = [
                'merchant_id' => $merchant['merchant_id'],
                'brand_id' => '',
                'email' => $merchant['email'],
                'token_version' => (int) ($payload['tv'] ?? 0),
                'exp' => (int) ($payload['exp'] ?? 0),
                'email_verified' => !empty($merchant['email_verified']),
                'role' => $isAdmin ? 'admin' : ($merchant['role'] ?? 'merchant'),
                'is_admin' => $isAdmin,
                'plan_id' => $isAdmin ? 'lifetime' : ($merchant['plan_id'] ?? 'starter'),
                'mode' => $mode,
                'auth' => 'jwt',
                'scopes' => self::allScopes(),
            ];
            $brand = self::resolveBrandForMerchant($merchant['merchant_id'], $payload, $req, $actor);
            $actor['brand_id'] = $brand !== null ? (string) $brand['brand_id'] : '';
            return $actor;
        }

        $rawKey = $bearer;
        if ($rawKey === null || $rawKey === '') {
            $rawKey = $_SERVER['HTTP_X_GRESSPAY_KEY'] ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
        }
        if (!is_string($rawKey) || $rawKey === '') {
            return null;
        }

        $mode = str_starts_with($rawKey, 'gp_test_') ? 'test' : 'live';
        $prefix = substr($rawKey, 0, 16);
        $keys = GpDb::all('SELECT * FROM gp_api_keys WHERE prefix = ? AND status = ?', [$prefix, 'active']);
        foreach ($keys as $row) {
            if (!password_verify($rawKey, $row['key_hash']) || $row['mode'] !== $mode) {
                continue;
            }
            GpDb::exec('UPDATE gp_api_keys SET last_used_at = ? WHERE id = ?', [GpIds::now(), $row['id']]);
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
            if ($brand === null) {
                return null;
            }
            $brandStatus = strtolower(trim((string) ($brand['brand_status'] ?? 'active')));
            if ($brandStatus !== '' && $brandStatus !== 'active') {
                return null;
            }
            $merchant = GpDb::one(
                'SELECT * FROM gp_merchants WHERE merchant_id = ? AND status = ?',
                [$brand['merchant_id'], 'active']
            );
            if ($merchant === null) {
                return null;
            }
            if ($mode === 'live' && empty($merchant['email_verified'])) return null;
            $scopes = self::parseScopes((string) ($row['scopes'] ?? ''));
            return [
                'merchant_id' => $brand['merchant_id'],
                'brand_id' => $brand['brand_id'],
                'email' => $merchant['email'] ?? '',
                'mode' => $mode,
                'auth' => 'api_key',
                'scopes' => $scopes,
            ];
        }
        return null;
    }

    public static function tokenCurrent(array $payload, array $merchant): bool
    {
        return (int) ($payload['tv'] ?? 0) === (int) ($merchant['token_version'] ?? 0);
    }

    public static function revokeSessions(string $merchantId): void
    {
        GpDb::exec('UPDATE gp_merchants SET token_version = token_version + 1 WHERE merchant_id = ?', [$merchantId]);
    }

    public static function requireVerified(array $actor): void
    {
        $row = GpDb::one('SELECT email_verified FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        if (empty($row['email_verified'])) GpJson::error('EMAIL_UNVERIFIED', 'Verify your email before going live.', 403);
    }

    /** JWT actors may select ledger via X-GressPay-Mode; public buyers never reach here. */
    private static function jwtLedgerMode(GpRequest $req): string
    {
        $header = strtolower(trim((string) ($_SERVER['HTTP_X_GRESSPAY_MODE'] ?? '')));
        if ($header === 'test') {
            return 'test';
        }
        return 'live';
    }

    /** @return list<string> */
    public static function allScopes(): array
    {
        return [
            'create_payment',
            'verify_payment',
            'read_transactions',
            'manage_links',
            'manage_invoices',
            'manage_methods',
            'manage_devices',
            'manage_provider',
        ];
    }

    /**
     * Fail closed: invalid/empty scope JSON yields no scopes (deny).
     * Explicit ["*"] grants all; otherwise only allowlisted scope strings.
     *
     * @return list<string>
     */
    public static function parseScopes(string $raw): array
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }
        $decoded = json_decode($trimmed, true);
        if (!is_array($decoded)) {
            return [];
        }
        $allowed = self::allScopes();
        $out = [];
        foreach ($decoded as $s) {
            if (!is_string($s) || $s === '') {
                continue;
            }
            if ($s === '*') {
                return $allowed;
            }
            if (in_array($s, $allowed, true)) {
                $out[] = $s;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * @param array{scopes?:list<string>,auth?:string} $actor
     */
    public static function requireScope(array $actor, string $scope): void
    {
        // JWT dashboard actors retain full product scopes; API keys must declare scopes explicitly.
        if (($actor['auth'] ?? '') === 'jwt') {
            $scopes = $actor['scopes'] ?? self::allScopes();
        } else {
            $scopes = $actor['scopes'] ?? [];
        }
        if (!is_array($scopes)) {
            $scopes = [];
        }
        if (!in_array($scope, $scopes, true) && !in_array('*', $scopes, true)) {
            GpJson::error('FORBIDDEN', 'API key missing scope: ' . $scope, 403);
        }
    }

    /**
     * @return array{merchant_id:string,brand_id:string,email:string,mode:string,auth:string,scopes:list<string>}
     */
    /**
     * Strictly enforce role-based admin authorization on the server/API.
     * Evaluates the authenticated merchant's email against GpConfig::adminEmails().
     * Fail closed: if allowlist is empty or actor email is not included, denies with 403 FORBIDDEN.
     *
     * @return array{merchant_id:string,brand_id:string,email:string,mode:string,auth:string,scopes:list<string>,is_admin:bool}
     */
    public static function requireAdmin(GpRequest $req): array
    {
        $actor = self::requireActor($req);
        $email = strtolower(trim((string) ($actor['email'] ?? '')));
        $isAdmin = !empty($actor['email_verified']) && (GpConfig::isAdmin($email) || (($actor['role'] ?? '') === 'admin'));
        if (($actor['auth'] ?? '') !== 'jwt' || !$isAdmin) {
            GpJson::error('FORBIDDEN', 'Administrator privileges required for this action.', 403);
        }
        $actor['is_admin'] = true;
        $actor['role'] = 'admin';
        return $actor;
    }

    public static function requireActor(GpRequest $req): array
    {
        $actor = self::resolveActor($req);
        if ($actor === null) {
            GpJson::error('UNAUTHORIZED', 'Bearer JWT or X-GressPay-Key required.', 401);
        }
        return $actor;
    }

    public static function requireDashboardUser(GpRequest $req): array
    {
        $actor = self::requireActor($req);
        if (($actor['auth'] ?? '') !== 'jwt') {
            GpJson::error('FORBIDDEN', 'Sign in to manage the workspace.', 403);
        }
        return $actor;
    }

    public static function activeBrandId(array $actor): string
    {
        return trim((string) ($actor['brand_id'] ?? ''));
    }

    /** @param array<string,mixed> $actor */
    public static function requireBrandContext(
        array $actor,
        string $message = 'Create a brand under Dashboard → Brands before using this feature.'
    ): string {
        $brandId = self::activeBrandId($actor);
        if ($brandId === '') {
            GpJson::error('NO_BRAND', $message, 400);
        }
        return $brandId;
    }

    /** @return array{merchant_id:string,brand_id:string,email:string,mode:string,auth:string,scopes:list<string>}|null */
    public static function optionalActor(GpRequest $req): ?array
    {
        return self::resolveActor($req);
    }

    public static function issueKey(string $brandId, string $mode, string $name): array
    {
        if ($mode !== 'test') {
            $owner = GpDb::one('SELECT m.email_verified FROM gp_merchants m INNER JOIN gp_brands b ON b.merchant_id = m.merchant_id WHERE b.brand_id = ?', [$brandId]);
            if (empty($owner['email_verified'])) GpJson::error('EMAIL_UNVERIFIED', 'Verify your email before issuing live API keys.', 403);
        }
        $plain = ($mode === 'test' ? 'gp_test_' : 'gp_live_') . bin2hex(random_bytes(18));
        $prefix = substr($plain, 0, 16);
        $now = GpIds::now();
        $sealed = GpCrypto::seal($plain);
        GpDb::exec(
            'INSERT INTO gp_api_keys (brand_id, name, prefix, key_hash, key_sealed, mode, scopes, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $brandId,
                $name,
                $prefix,
                password_hash($plain, PASSWORD_BCRYPT),
                $sealed,
                $mode,
                GpIds::defaultScopes(),
                'active',
                $now,
                $now,
            ]
        );
        return [
            'name' => $name,
            'mode' => $mode,
            'key' => $plain,
            'prefix' => $prefix,
        ];
    }

    public static function seedCurrencies(string $brandId): void
    {
        $now = GpIds::now();
        $rows = [
            ['BDT', '৳', '122.5'],
            ['USD', '$', '1'],
            ['USDT', '₮', '1'],
        ];
        foreach ($rows as [$code, $symbol, $rate]) {
            $exists = GpDb::one('SELECT id FROM gp_currency WHERE brand_id = ? AND code = ?', [$brandId, $code]);
            if ($exists) {
                continue;
            }
            GpDb::exec(
                'INSERT INTO gp_currency (brand_id, code, symbol, rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [$brandId, $code, $symbol, $rate, $now, $now]
            );
        }
    }

    /**
     * Prefer X-GressPay-Brand header, then JWT brand claim, else first brand for the merchant.
     * Team staff may select brands owned by the workspace owner when allow-listed.
     *
     * @param array<string,mixed> $payload
     * @param array<string,mixed>|null $actorMut mutated with team_* fields when staff
     * @return array<string,mixed>|null
     */
    private static function resolveBrandForMerchant(
        string $merchantId,
        array $payload,
        GpRequest $req,
        ?array &$actorMut = null
    ): ?array {
        $headerBrand = trim((string) ($_SERVER['HTTP_X_GRESSPAY_BRAND'] ?? ''));
        $claimBrand = trim((string) ($payload['brand'] ?? ''));
        $wanted = $headerBrand !== '' ? $headerBrand : $claimBrand;

        // Own brands first.
        if ($wanted !== '') {
            $own = GpDb::one(
                'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$wanted, $merchantId]
            );
            if ($own !== null) {
                return $own;
            }
        } else {
            $ownFirst = GpDb::one(
                'SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC',
                [$merchantId]
            );
            if ($ownFirst !== null && $wanted === '') {
                // Still check team if header empty — prefer own brand.
                return $ownFirst;
            }
        }

        // Team staff access to owner brands.
        $email = '';
        if (is_array($actorMut)) {
            $email = strtolower(trim((string) ($actorMut['email'] ?? '')));
        }
        $membership = GpDb::one(
            "SELECT * FROM gp_team_members
             WHERE status = 'active'
               AND (user_merchant_id = ? OR LOWER(email) = ?)
             ORDER BY id DESC",
            [$merchantId, $email]
        );
        if (!is_array($membership)) {
            if ($wanted !== '') {
                return null;
            }
            return GpDb::one(
                'SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC',
                [$merchantId]
            );
        }

        $memberId = (string) $membership['member_id'];
        $allowed = GpTeam::brandIdsForMember($memberId);
        $ownerId = (string) $membership['owner_merchant_id'];
        $perms = json_decode((string) ($membership['permissions_json'] ?? '{}'), true);
        if (is_array($actorMut)) {
            $actorMut['team_member_id'] = $memberId;
            $actorMut['workspace_merchant_id'] = $ownerId;
            $actorMut['team_role'] = (string) ($membership['role'] ?? 'manager');
            $actorMut['allowed_brand_ids'] = $allowed;
            $actorMut['permissions'] = GpTeam::normalizePermissions(
                is_array($perms) ? $perms : null,
                (string) ($membership['role'] ?? 'manager')
            );
            // Effective merchant for brand-owned resources is the workspace owner.
            $actorMut['merchant_id'] = $ownerId;
            $actorMut['staff_user_merchant_id'] = $merchantId;
        }

        if ($wanted !== '') {
            if (!in_array($wanted, $allowed, true)) {
                return null;
            }
            return GpDb::one(
                'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$wanted, $ownerId]
            );
        }
        if ($allowed === []) {
            return null;
        }
        return GpDb::one(
            'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
            [$allowed[0], $ownerId]
        );
    }
}
