<?php
declare(strict_types=1);

/** Team membership helpers — brand-scoped staff under an owner merchant. */
final class GpTeam
{
    public const MODULES = [
        'dashboard',
        'transactions',
        'invoices',
        'gateways',
        'brands',
        'devices',
        'payment_links',
        'webhooks',
    ];

    public const ACTIONS = ['view', 'create', 'edit', 'delete'];

    /** @return array<string, array{view:bool,create:bool,edit:bool,delete:bool}> */
    public static function defaultPermissions(string $role): array
    {
        $empty = [];
        foreach (self::MODULES as $m) {
            $empty[$m] = ['view' => false, 'create' => false, 'edit' => false, 'delete' => false];
        }
        $role = strtolower($role);
        if ($role === 'support') {
            $empty['dashboard']['view'] = true;
            $empty['transactions']['view'] = true;
            $empty['webhooks']['view'] = true;
            $empty['webhooks']['edit'] = true; // resend
            return $empty;
        }
        // manager default
        foreach (['dashboard', 'transactions', 'invoices', 'gateways', 'devices', 'payment_links'] as $m) {
            $empty[$m] = ['view' => true, 'create' => true, 'edit' => true, 'delete' => true];
        }
        $empty['brands'] = ['view' => true, 'create' => false, 'edit' => false, 'delete' => false];
        $empty['webhooks'] = ['view' => true, 'create' => false, 'edit' => true, 'delete' => false];
        $empty['gateways']['delete'] = true;
        return $empty;
    }

    /**
     * @param array<string,mixed>|null $permissions
     * @return array<string, array{view:bool,create:bool,edit:bool,delete:bool}>
     */
    public static function normalizePermissions(?array $permissions, string $role = 'manager'): array
    {
        $base = self::defaultPermissions($role);
        if (!is_array($permissions) || $permissions === []) {
            return $base;
        }
        foreach (self::MODULES as $m) {
            if (!isset($permissions[$m]) || !is_array($permissions[$m])) {
                continue;
            }
            foreach (self::ACTIONS as $a) {
                if (array_key_exists($a, $permissions[$m])) {
                    $base[$m][$a] = (bool) $permissions[$m][$a];
                }
            }
        }
        return $base;
    }

    /** @param array<string,mixed> $actor */
    public static function can(array $actor, string $module, string $action): bool
    {
        if (!empty($actor['is_admin']) || ($actor['role'] ?? '') === 'admin') {
            return true;
        }
        // Workspace owner (acting on own merchant brands)
        if (empty($actor['team_member_id'])) {
            return true;
        }
        $perms = $actor['permissions'] ?? [];
        if (!is_array($perms)) {
            return false;
        }
        $module = strtolower($module);
        $action = strtolower($action);
        return !empty($perms[$module][$action]);
    }

    /** @param array<string,mixed> $actor */
    public static function requireCan(array $actor, string $module, string $action): void
    {
        if (!self::can($actor, $module, $action)) {
            GpJson::error('FORBIDDEN', 'Your team role cannot ' . $action . ' on ' . $module . '.', 403);
        }
    }

    /** @return array<string,mixed>|null */
    public static function activeMembershipForUser(string $userMerchantId, string $email): ?array
    {
        $email = strtolower(trim($email));
        $row = GpDb::one(
            "SELECT * FROM gp_team_members
             WHERE status = 'active'
               AND (user_merchant_id = ? OR LOWER(email) = ?)
             ORDER BY id DESC",
            [$userMerchantId, $email]
        );
        return is_array($row) ? $row : null;
    }

    /** @return list<string> */
    public static function brandIdsForMember(string $memberId): array
    {
        $rows = GpDb::all(
            'SELECT brand_id FROM gp_team_member_brands WHERE member_id = ?',
            [$memberId]
        );
        $out = [];
        foreach ($rows as $r) {
            $id = trim((string) ($r['brand_id'] ?? ''));
            if ($id !== '') {
                $out[] = $id;
            }
        }
        return $out;
    }

    /** @param array<string,mixed> $brand @param array<string,mixed> $actor */
    public static function actorCanAccessBrand(array $actor, array $brand): bool
    {
        $merchantId = (string) ($actor['merchant_id'] ?? '');
        $ownerId = (string) ($brand['merchant_id'] ?? '');
        if (($actor['auth'] ?? '') === 'api_key') {
            return $merchantId === $ownerId && ($actor['brand_id'] ?? '') === $brand['brand_id'];
        }
        if (empty($actor['team_member_id']) && $merchantId !== '' && $merchantId === $ownerId) {
            return true;
        }
        $workspace = (string) ($actor['workspace_merchant_id'] ?? '');
        if ($workspace !== '' && $workspace === $ownerId) {
            $allowed = $actor['allowed_brand_ids'] ?? [];
            if (!is_array($allowed) || $allowed === []) {
                return false;
            }
            return in_array((string) $brand['brand_id'], $allowed, true);
        }
        return false;
    }
}
