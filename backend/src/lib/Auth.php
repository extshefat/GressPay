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
            if ($merchant === null) {
                return null;
            }
            $email = strtolower(trim((string) ($merchant['email'] ?? '')));
            $isAdmin = GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin');
            if ($isAdmin && (($merchant['role'] ?? '') !== 'admin' || ($merchant['plan_id'] ?? '') !== 'lifetime')) {
                GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$merchant['merchant_id']]);
                $merchant['role'] = 'admin';
                $merchant['plan_id'] = 'lifetime';
            }
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ?', [$merchant['merchant_id']]);
            if ($brand === null) {
                return null;
            }
            $mode = self::jwtLedgerMode($req);
            return [
                'merchant_id' => $merchant['merchant_id'],
                'brand_id' => $brand['brand_id'],
                'email' => $merchant['email'],
                'role' => $isAdmin ? 'admin' : ($merchant['role'] ?? 'merchant'),
                'is_admin' => $isAdmin,
                'plan_id' => $isAdmin ? 'lifetime' : ($merchant['plan_id'] ?? 'starter'),
                'mode' => $mode,
                'auth' => 'jwt',
                'scopes' => self::allScopes(),
            ];
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
            $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$brand['merchant_id']]);
            $scopes = self::parseScopes($row['scopes'] ?? '');
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

    /** @return list<string> */
    private static function parseScopes(string $raw): array
    {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return self::allScopes();
        }
        $out = [];
        foreach ($decoded as $s) {
            if (is_string($s) && $s !== '') {
                $out[] = $s;
            }
        }
        return $out !== [] ? $out : self::allScopes();
    }

    /**
     * @param array{scopes?:list<string>} $actor
     */
    public static function requireScope(array $actor, string $scope): void
    {
        $scopes = $actor['scopes'] ?? self::allScopes();
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
        $isAdmin = GpConfig::isAdmin($email) || (($actor['role'] ?? '') === 'admin');
        if (!$isAdmin) {
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

    /** @return array{merchant_id:string,brand_id:string,email:string,mode:string,auth:string,scopes:list<string>}|null */
    public static function optionalActor(GpRequest $req): ?array
    {
        return self::resolveActor($req);
    }

    public static function issueKey(string $brandId, string $mode, string $name): array
    {
        $plain = ($mode === 'test' ? 'gp_test_' : 'gp_live_') . bin2hex(random_bytes(18));
        $prefix = substr($plain, 0, 16);
        $now = GpIds::now();
        GpDb::exec(
            'INSERT INTO gp_api_keys (brand_id, name, prefix, key_hash, mode, scopes, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $brandId,
                $name,
                $prefix,
                password_hash($plain, PASSWORD_BCRYPT),
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
}
