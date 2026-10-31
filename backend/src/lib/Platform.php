<?php
declare(strict_types=1);

final class GpPlatform
{
    /** All Stage-2 live rails (MFS + crypto). Platform-wide enablement is via gp_platform_gateways. */
    /** @var list<string> */
    public const LIVE_RAILS = [
        'bkash',
        'nagad',
        'rocket',
        'upay',
        'cellfin',
        'binance_pay',
        'bybit_pay',
        'usdt_trc20',
    ];

    /** @var list<string> */
    public const UNAVAILABLE_RAILS = [];

    public static function checkoutAllowed(string $code): bool
    {
        if (!in_array($code, self::LIVE_RAILS, true)) {
            return false;
        }
        return GpCatalog::isPlatformEnabled($code);
    }

    /** @return list<array{code:string,enabled:bool,available:bool}> */
    public static function listRails(): array
    {
        $out = [];
        foreach (self::LIVE_RAILS as $code) {
            $out[] = [
                'code' => $code,
                'enabled' => self::checkoutAllowed($code),
                'available' => true,
            ];
        }
        return $out;
    }

    public static function setRail(string $code, bool $enabled): void
    {
        if (!in_array($code, self::LIVE_RAILS, true)) {
            GpJson::error('RAIL_UNAVAILABLE', 'Unknown payment rail.', 400);
        }
        $gw = GpDb::one('SELECT * FROM gp_platform_gateways WHERE gateway_code = ?', [$code]);
        if (!is_array($gw)) {
            GpJson::error('NOT_FOUND', 'Platform gateway row missing for rail.', 404);
        }
        $flag = $enabled ? 1 : 0;
        GpDb::exec(
            'UPDATE gp_platform_gateways SET is_enabled = ?, updated_at = ? WHERE gateway_code = ?',
            [$flag, GpIds::now(), $code]
        );
        $now = GpIds::now();
        $existing = GpDb::one('SELECT flag_key FROM gp_platform_flags WHERE flag_key = ?', [$code]);
        if (is_array($existing)) {
            GpDb::exec('UPDATE gp_platform_flags SET enabled = ?, updated_at = ? WHERE flag_key = ?', [$flag, $now, $code]);
            return;
        }
        try {
            GpDb::exec('INSERT INTO gp_platform_flags (flag_key, enabled, updated_at) VALUES (?, ?, ?)', [$code, $flag, $now]);
        } catch (Throwable $e) {
            // optional mirror table
        }
    }

    /**
     * Plan quotas for a brand (companion devices + gateway instances).
     *
     * @return array{deviceLimit:int,methodLimit:int,planId:string}
     */
    public static function planLimitsForBrand(string $brandId): array
    {
        $brand = GpDb::one('SELECT merchant_id FROM gp_brands WHERE brand_id = ?', [$brandId]);
        if ($brand === null) {
            return ['deviceLimit' => 1, 'methodLimit' => 2, 'planId' => 'starter'];
        }
        $merchant = GpDb::one(
            'SELECT plan_id, role FROM gp_merchants WHERE merchant_id = ?',
            [(string) $brand['merchant_id']]
        );
        $planId = strtolower(trim((string) ($merchant['plan_id'] ?? 'starter')));
        if (($merchant['role'] ?? '') === 'admin') {
            return ['deviceLimit' => 999, 'methodLimit' => 999, 'planId' => 'lifetime'];
        }
        $planRow = GpDb::one(
            'SELECT device_limit, method_limit FROM gp_plans WHERE plan_id = ? OR code = ? LIMIT 1',
            [$planId, $planId]
        );
        if ($planRow === null) {
            $planRow = GpDb::one(
                'SELECT device_limit, method_limit FROM gp_subscription_plans WHERE plan_id = ? OR code = ? LIMIT 1',
                [$planId, $planId]
            );
        }
        return [
            'deviceLimit' => max(1, (int) ($planRow['device_limit'] ?? 1)),
            'methodLimit' => max(1, (int) ($planRow['method_limit'] ?? 2)),
            'planId' => $planId,
        ];
    }

    public static function assertDeviceRegistrationAllowed(string $brandId): void
    {
        $limits = self::planLimitsForBrand($brandId);
        $active = (int) (GpDb::one(
            "SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = 'active'",
            [$brandId]
        )['c'] ?? 0);
        if ($active >= $limits['deviceLimit']) {
            GpJson::error(
                'QUOTA',
                'Active companion device limit reached for your plan (' . $limits['deviceLimit'] . ').',
                403
            );
        }
    }

    public static function assertGatewayCreationAllowed(string $brandId): void
    {
        $limits = self::planLimitsForBrand($brandId);
        $count = (int) (GpDb::one(
            'SELECT COUNT(*) AS c FROM gp_gateways WHERE brand_id = ?',
            [$brandId]
        )['c'] ?? 0);
        if ($count >= $limits['methodLimit']) {
            GpJson::error(
                'QUOTA',
                'Gateway limit reached for your plan (' . $limits['methodLimit'] . ').',
                400
            );
        }
    }

    /** Public HTTPS base for merchant integration docs (no trailing slash). */
    public static function publicApiBase(): string
    {
        $fromEnv = trim((string) (getenv('GRESSPAY_PUBLIC_API_BASE') ?: ''));
        if ($fromEnv !== '') {
            return rtrim($fromEnv, '/');
        }
        return 'https://gresspay.extxcheats.com/api/v1';
    }
}
