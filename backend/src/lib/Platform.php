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
}
