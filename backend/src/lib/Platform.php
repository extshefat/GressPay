<?php
declare(strict_types=1);

final class GpPlatform
{
    /** @var list<string> */
    public const LIVE_RAILS = ['bkash', 'nagad', 'binance_pay', 'usdt_trc20'];

    /** @var list<string> */
    public const UNAVAILABLE_RAILS = ['rocket', 'upay', 'cellfin', 'bybit_pay'];

    public static function checkoutAllowed(string $code): bool
    {
        if (!in_array($code, self::LIVE_RAILS, true)) {
            return false;
        }
        try {
            $row = GpDb::one('SELECT enabled FROM gp_platform_flags WHERE flag_key = ?', [$code]);
            if (!is_array($row)) {
                return true;
            }
            return (int) ($row['enabled'] ?? 0) === 1;
        } catch (Throwable $e) {
            return true;
        }
    }

    /** @return list<array{code:string,enabled:bool,available:bool}> */
    public static function listRails(): array
    {
        $out = [];
        foreach (array_merge(self::LIVE_RAILS, self::UNAVAILABLE_RAILS) as $code) {
            $out[] = [
                'code' => $code,
                'enabled' => self::checkoutAllowed($code),
                'available' => in_array($code, self::LIVE_RAILS, true),
            ];
        }
        return $out;
    }

    public static function setRail(string $code, bool $enabled): void
    {
        if (!in_array($code, self::LIVE_RAILS, true)) {
            GpJson::error('RAIL_UNAVAILABLE', 'This rail has no live verifier and cannot be enabled.', 400);
        }
        $now = GpIds::now();
        $flag = $enabled ? 1 : 0;
        $existing = GpDb::one('SELECT flag_key FROM gp_platform_flags WHERE flag_key = ?', [$code]);
        if (is_array($existing)) {
            GpDb::exec('UPDATE gp_platform_flags SET enabled = ?, updated_at = ? WHERE flag_key = ?', [$flag, $now, $code]);
            return;
        }
        GpDb::exec('INSERT INTO gp_platform_flags (flag_key, enabled, updated_at) VALUES (?, ?, ?)', [$code, $flag, $now]);
    }
}
