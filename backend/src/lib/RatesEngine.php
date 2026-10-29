<?php
declare(strict_types=1);

final class GpRatesEngine
{
    /** USD-base fallback used for public homepage rates. */
    public static function defaults(): array
    {
        return [
            'USD' => 1.0,
            'USDT' => 1.0,
            'BDT' => 122.5,
            'INR' => 88.4,
            'PKR' => 284.1,
            'NPR' => 141.2,
            'EUR' => 0.92,
        ];
    }

    public static function usdMap(string $brandId): array
    {
        $map = self::defaults();
        $rows = GpDb::all('SELECT code, rate FROM gp_currency WHERE brand_id = ?', [$brandId]);
        foreach ($rows as $row) {
            $map[$row['code']] = (float) $row['rate'];
        }
        return $map;
    }

    public static function publicPayload(?string $brandId = null): array
    {
        $rows = [];
        if ($brandId) {
            $rows = GpDb::all('SELECT code, rate, updated_at FROM gp_currency WHERE brand_id = ?', [$brandId]);
        }
        if ($rows === []) {
            $any = GpDb::one('SELECT brand_id FROM gp_brands ORDER BY id ASC LIMIT 1');
            if ($any) {
                $rows = GpDb::all('SELECT code, rate, updated_at FROM gp_currency WHERE brand_id = ?', [$any['brand_id']]);
            }
        }
        return GpPresenters::ratesMap($rows);
    }

    public static function convert(string $brandId, string $amount, string $from, string $to): string
    {
        if ($from === $to) {
            return GpMoney::round($amount);
        }
        $map = self::usdMap($brandId);
        $fromRate = $map[$from] ?? 0;
        $toRate = $map[$to] ?? 0;
        if ($fromRate <= 0 || $toRate <= 0) {
            return GpMoney::round($amount);
        }
        $usd = (float) $amount / $fromRate;
        return GpMoney::round((string) ($usd * $toRate));
    }

    /**
     * USDT display quote for BDT or USD checkout amounts.
     * Returns null when no rate exists, so a missing rate is not shown as 1:1.
     *
     * @return array{amount:string,rate:string}|null
     */
    public static function usdtQuote(string $brandId, string $amount, string $from): ?array
    {
        $from = strtoupper(trim($from));
        if (!in_array($from, ['BDT', 'USD'], true)) {
            return null;
        }
        $amount = GpMoney::sanitize($amount);
        if ($from === 'USD') {
            $map = self::usdMap($brandId);
            $usd = (float) ($map['USD'] ?? 0);
            $usdt = (float) ($map['USDT'] ?? 0);
            if ($usd <= 0 || $usdt <= 0) {
                return null;
            }
            $quoted = ((float) $amount / $usd) * $usdt;
            $rate = $usdt / $usd;
            return [
                'amount' => GpMoney::round((string) $quoted, 2),
                'rate' => GpMoney::round((string) $rate, 2),
            ];
        }
        $custom = self::customRateBdt($brandId);
        if ($custom !== null && $custom > 0) {
            return [
                'amount' => GpMoney::round((string) ((float) $amount / $custom), 2),
                'rate' => GpMoney::round((string) $custom, 2),
            ];
        }
        $map = self::usdMap($brandId);
        $bdt = (float) ($map['BDT'] ?? 0);
        $usdt = (float) ($map['USDT'] ?? 0);
        if ($bdt <= 0 || $usdt <= 0) {
            return null;
        }
        $quoted = ((float) $amount / $bdt) * $usdt;
        return [
            'amount' => GpMoney::round((string) $quoted, 2),
            'rate' => GpMoney::round((string) ($bdt / $usdt), 2),
        ];
    }

    /** Brand-only BDT per 1 USDT override stored on a method options row. */
    public static function customRateBdt(string $brandId): ?float
    {
        $rows = GpDb::all('SELECT options FROM gp_methods WHERE brand_id = ?', [$brandId]);
        foreach ($rows as $row) {
            $opts = json_decode((string) ($row['options'] ?? ''), true);
            if (!is_array($opts) || !isset($opts['custom_rate_bdt']) || $opts['custom_rate_bdt'] === '') {
                continue;
            }
            $rate = (float) $opts['custom_rate_bdt'];
            if ($rate > 0) {
                return $rate;
            }
        }
        return null;
    }
}
