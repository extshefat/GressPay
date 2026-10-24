<?php
declare(strict_types=1);

final class GpCatalog
{
    /**
     * Public `code` is what the Next.js UI uses. Internal `slug` is the plugin folder.
     * releaseScope=false methods are kept for future phases but not offered as live in this release.
     *
     * @return list<array<string,mixed>>
     */
    public static function methods(): array
    {
        return [
            self::row('bkash', 'bkash-personal', 'bKash (personal + SMS match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.2, 50, 25000),
            self::row('nagad', 'nagad-personal', 'Nagad (personal + SMS match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.0, 50, 25000),
            self::row('rocket', 'rocket-personal', 'Rocket', 'BD', 'BDT', 'mfs', 'automation', false, true, 1.2, 50, 25000),
            self::row('upay', 'upay-personal', 'Upay', 'BD', 'BDT', 'mfs', 'automation', false, true, 1.2, 50, 25000),
            self::row('cellfin', 'cellfin-personal', 'Cellfin', 'BD', 'BDT', 'mfs', 'automation', false, true, 1.0, 50, 25000),
            self::row('upi_qr', 'upi-qr-personal', 'UPI QR', 'IN', 'INR', 'bank_upi', 'automation', false, true, 0.5, 10, 100000),
            self::row('phonepe', 'phonepe-intent', 'PhonePe', 'IN', 'INR', 'bank_upi', 'automation', false, true, 0.5, 10, 100000),
            self::row('easypaisa', 'easypaisa-personal', 'Easypaisa', 'PK', 'PKR', 'mfs', 'automation', false, true, 1.5, 50, 50000),
            self::row('jazzcash', 'jazzcash-personal', 'JazzCash', 'PK', 'PKR', 'mfs', 'automation', false, true, 1.5, 50, 50000),
            self::row('esewa', 'esewa-personal', 'eSewa', 'NP', 'NPR', 'mfs', 'automation', false, true, 1.0, 10, 50000),
            self::row('khalti', 'khalti-personal', 'Khalti', 'NP', 'NPR', 'mfs', 'automation', false, true, 1.0, 10, 50000),
            self::row('binance_pay', 'binance-personal', 'Binance Pay', 'GLOBAL', 'USDT', 'crypto', 'provider', true, true, 0.5, 1, 100000),
            self::row('bybit_pay', 'bybit-pay', 'Bybit Pay', 'GLOBAL', 'USDT', 'crypto', 'manual', false, true, 0.5, 1, 100000),
            self::row('usdt_trc20', 'usdt-trc20', 'USDT TRC-20', 'GLOBAL', 'USDT', 'crypto', 'onchain', true, true, 0.0, 1, 100000),
        ];
    }

    /** @return list<array<string,mixed>> */
    public static function releaseMethods(): array
    {
        return array_values(array_filter(self::methods(), static fn ($m) => !empty($m['releaseScope'])));
    }

    private static function row(
        string $code,
        string $slug,
        string $title,
        string $country,
        string $currency,
        string $category,
        string $type,
        bool $releaseScope,
        bool $requiresTxid,
        float $feePct,
        float $min,
        float $max
    ): array {
        return [
            'code' => $code,
            'slug' => $slug,
            'title' => $title,
            'country' => $country,
            'currency' => $currency,
            'category' => $category,
            'type' => $type,
            'releaseScope' => $releaseScope,
            'requiresTxidInput' => $requiresTxid,
            'feePercentage' => $feePct,
            'fixedFee' => 0,
            'minAmount' => $min,
            'maxAmount' => $max,
        ];
    }

    public static function find(string $codeOrSlug): ?array
    {
        foreach (self::methods() as $m) {
            if ($m['code'] === $codeOrSlug || $m['slug'] === $codeOrSlug) {
                return $m;
            }
        }
        return null;
    }

    public static function publicCode(string $codeOrSlug): string
    {
        $m = self::find($codeOrSlug);
        return $m['code'] ?? $codeOrSlug;
    }

    public static function slug(string $codeOrSlug): string
    {
        $m = self::find($codeOrSlug);
        return $m['slug'] ?? $codeOrSlug;
    }

    public static function loadPlugin(string $codeOrSlug): ?GatewayInterface
    {
        $slug = self::slug($codeOrSlug);
        $file = GRESSPAY_SRC . '/gateways/' . $slug . '/class.php';
        if (!is_file($file)) {
            return null;
        }
        require_once GRESSPAY_SRC . '/gateways/GatewayInterface.php';
        require_once $file;
        $class = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $slug))) . 'Gateway';
        if (!class_exists($class)) {
            return null;
        }
        $gw = new $class();
        return $gw instanceof GatewayInterface ? $gw : null;
    }
}
