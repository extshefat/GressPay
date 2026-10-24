<?php
declare(strict_types=1);

final class GpFeeEngine
{
    /** Phase 1 default: 0% invoice fee, 1% optional send later. Merchant fee stored on method options. */
    public static function compute(array $methodRow, string $amount, string $currency): array
    {
        $opts = [];
        if (!empty($methodRow['options'])) {
            $decoded = json_decode((string) $methodRow['options'], true);
            $opts = is_array($decoded) ? $decoded : [];
        }
        $pct = GpMoney::sanitize($opts['percentage_charge'] ?? '0');
        $fixed = GpMoney::sanitize($opts['fixed_charge'] ?? '0');
        $fee = GpMoney::add($fixed, GpMoney::div(GpMoney::mul($amount, $pct), '100'));
        $net = GpMoney::sub($amount, $fee);
        if ((float) $net < 0) {
            $net = '0.00';
        }
        return [
            'fee' => GpMoney::round($fee),
            'discount' => '0.00',
            'local_net' => GpMoney::round($net),
            'local_currency' => $currency,
        ];
    }
}
