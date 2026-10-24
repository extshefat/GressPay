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
}
