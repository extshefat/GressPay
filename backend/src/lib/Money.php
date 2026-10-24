<?php
declare(strict_types=1);

/**
 * Decimal-safe money helpers. Prefer BCMath when available; never use float for payable math.
 */
final class GpMoney
{
    public static function sanitize(mixed $value, int $scale = 8): string
    {
        if ($value === null || $value === '') {
            return self::format('0', $scale);
        }
        $s = preg_replace('/[^0-9.\-]/', '', (string) $value) ?: '0';
        if ($s === '' || $s === '-' || $s === '.' || !preg_match('/^-?\d+(\.\d+)?$/', $s)) {
            return self::format('0', $scale);
        }
        return self::format($s, $scale);
    }

    public static function format(string $amount, int $scale = 8): string
    {
        if (function_exists('bcadd')) {
            return bcadd($amount, '0', $scale);
        }
        // Fallback only if BCMath missing — still stringify via number_format after parse.
        return number_format((float) $amount, $scale, '.', '');
    }

    public static function round(string $amount, int $decimals = 2): string
    {
        return self::format(self::sanitize($amount, max(8, $decimals)), $decimals);
    }

    public static function add(string $a, string $b, int $scale = 8): string
    {
        $a = self::sanitize($a, $scale);
        $b = self::sanitize($b, $scale);
        if (function_exists('bcadd')) {
            return bcadd($a, $b, $scale);
        }
        return self::sanitize((string) ((float) $a + (float) $b), $scale);
    }

    public static function sub(string $a, string $b, int $scale = 8): string
    {
        $a = self::sanitize($a, $scale);
        $b = self::sanitize($b, $scale);
        if (function_exists('bcsub')) {
            return bcsub($a, $b, $scale);
        }
        return self::sanitize((string) ((float) $a - (float) $b), $scale);
    }

    public static function mul(string $a, string $b, int $scale = 8): string
    {
        $a = self::sanitize($a, $scale);
        $b = self::sanitize($b, $scale);
        if (function_exists('bcmul')) {
            return bcmul($a, $b, $scale);
        }
        return self::sanitize((string) ((float) $a * (float) $b), $scale);
    }

    public static function div(string $a, string $b, int $scale = 8): string
    {
        $a = self::sanitize($a, $scale);
        $b = self::sanitize($b, $scale);
        if (function_exists('bccomp') && bccomp($b, '0', $scale) === 0) {
            return self::format('0', $scale);
        }
        if (function_exists('bcdiv')) {
            return bcdiv($a, $b, $scale);
        }
        $d = (float) $b;
        if ($d == 0.0) {
            return self::format('0', $scale);
        }
        return self::sanitize((string) ((float) $a / $d), $scale);
    }

    /** Absolute difference as string. */
    public static function absDiff(string $a, string $b, int $scale = 8): string
    {
        $diff = self::sub($a, $b, $scale);
        if (str_starts_with($diff, '-')) {
            return substr($diff, 1);
        }
        return $diff;
    }

    /** True if |a-b| <= tolerance (+ tiny epsilon for display scale). */
    public static function withinTolerance(string $a, string $b, string $tolerance, int $scale = 8): bool
    {
        $diff = self::absDiff($a, $b, $scale);
        $tol = self::sanitize($tolerance, $scale);
        if (function_exists('bccomp')) {
            // allow 0.009 cushion for 2-dp wallets when scale=8
            $cushion = self::add($tol, '0.009', $scale);
            return bccomp($diff, $cushion, $scale) <= 0;
        }
        return abs((float) $diff) <= abs((float) $tol) + 0.009;
    }
}
