<?php
declare(strict_types=1);

final class GpCatalog
{
    /**
     * Commercial gateway catalog prioritizing core Bangladesh MFS and Crypto.
     * Public `code` is used across APIs and UI. Internal `slug` is the plugin folder.
     *
     * @return list<array<string,mixed>>
     */
    public static function methods(): array
    {
        return [
            // Core Bangladesh MFS (Companion SMS)
            self::row('bkash', 'bkash-personal', 'bKash Personal (Direct Wallet + SMS Match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.2, 10, 25000),
            self::row('nagad', 'nagad-personal', 'Nagad Personal (Direct Wallet + SMS Match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.0, 10, 25000),
            self::row('rocket', 'rocket-personal', 'Rocket Personal (Direct Wallet + SMS Match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.2, 10, 25000),
            self::row('upay', 'upay-personal', 'Upay Personal (Direct Wallet + SMS Match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.0, 10, 25000),
            self::row('cellfin', 'cellfin-personal', 'Cellfin IBBL (Smart Banking + SMS Match)', 'BD', 'BDT', 'mfs', 'automation', true, true, 1.0, 10, 50000),

            // Bangladesh QR & extended MFS (manual TxID / optional QR; Companion when sender matches)
            self::row('bangla_qr', 'bangla-qr-personal', 'Bangla QR', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('bangla_qr_v2', 'bangla-qr-v2-personal', 'Bangla QR V2', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('pathaopay', 'pathaopay-personal', 'Pathao Pay', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('mcash', 'mcash-personal', 'mCash', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('ok_wallet', 'ok-wallet-personal', 'OK Wallet', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('tap', 'tap-personal', 'Tap', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),
            self::row('aamar_pay', 'aamar-pay-personal', 'aamarPay', 'BD', 'BDT', 'mfs', 'manual', true, true, 0.0, 10, 100000),

            // Crypto Rails
            self::row('usdt_trc20', 'usdt-trc20', 'USDT TRC-20 (TRON Blockchain)', 'GLOBAL', 'USDT', 'crypto', 'onchain', true, true, 0.0, 1, 100000),
            self::row('binance_pay', 'binance-personal', 'Binance Pay (Merchant API / QR)', 'GLOBAL', 'USDT', 'crypto', 'binance_pay_merchant', true, false, 0.0, 1, 100000),
            self::row('bybit_pay', 'bybit-pay', 'Bybit Pay (Internal Transfer / UID)', 'GLOBAL', 'USDT', 'crypto', 'manual', true, true, 0.0, 1, 100000),
        ];
    }

    /** @return list<string> */
    public static function bdMobileWalletCodes(): array
    {
        return [
            'bkash', 'nagad', 'rocket', 'upay', 'cellfin',
            'bangla_qr', 'bangla_qr_v2', 'pathaopay', 'mcash', 'ok_wallet', 'tap', 'aamar_pay',
        ];
    }

    /**
     * Checks if a gateway is enabled platform-wide by Super Admin.
     */
    public static function isPlatformEnabled(string $codeOrSlug): bool
    {
        $m = self::find($codeOrSlug);
        if ($m === null) {
            return false;
        }
        try {
            $row = GpDb::withinSavepoint(
                static fn () => GpDb::one(
                    'SELECT is_enabled FROM gp_platform_gateways WHERE gateway_code IN (?, ?) LIMIT 1',
                    [$m['code'], $m['slug']]
                )
            );
            if ($row !== null) {
                return (int) $row['is_enabled'] === 1;
            }
        } catch (Throwable $e) {
            // fallback if table is not yet queried or initialized
        }
        return !empty($m['releaseScope']);
    }

    /** @return list<array<string,mixed>> */
    public static function releaseMethods(): array
    {
        return array_values(array_filter(self::methods(), static fn ($m) => self::isPlatformEnabled($m['code'])));
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
