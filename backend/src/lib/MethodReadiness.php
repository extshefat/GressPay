<?php
declare(strict_types=1);

final class GpMethodReadiness
{
    /**
     * @param array<string,mixed> $catalog
     * @param array<string,mixed>|null $row
     * @param array<string,mixed>|null $brand
     * @return array{liveReady:bool,reasons:list<string>,integrationType:string,label:string}
     */
    public static function evaluate(array $catalog, ?array $row, ?array $brand = null): array
    {
        $code = (string) $catalog['code'];
        $type = (string) ($catalog['type'] ?? 'manual');
        $reasons = [];
        $liveReady = true;

        if (empty($catalog['releaseScope'])) {
            return [
                'liveReady' => false,
                'reasons' => ['Not in first-release scope (India/Pakistan/other rails disabled).'],
                'integrationType' => $type,
                'label' => (string) $catalog['title'],
            ];
        }

        $opts = [];
        if ($row && !empty($row['options'])) {
            $decoded = json_decode((string) $row['options'], true);
            $opts = is_array($decoded) ? $decoded : [];
        }
        $account = trim((string) ($opts['account'] ?? $opts['depositAddressOrNumber'] ?? $opts['mobile_number'] ?? ''));
        $enabled = $row !== null && ($row['status'] ?? '') === 'active';

        if (!$enabled) {
            $liveReady = false;
            $reasons[] = 'Method is not enabled by the merchant.';
        }

        if (in_array($code, ['bkash', 'nagad'], true)) {
            if ($account === '') {
                $liveReady = false;
                $reasons[] = 'Receiving wallet number not configured.';
            }
            return [
                'liveReady' => $liveReady,
                'reasons' => $reasons,
                'integrationType' => 'personal_sms_match',
                'label' => $code === 'bkash'
                    ? 'bKash personal number + SMS companion match'
                    : 'Nagad personal number + SMS companion match',
            ];
        }

        if ($code === 'binance_pay') {
            if (!GpConfig::cryptoAllowed()) {
                $liveReady = false;
                $reasons[] = 'Operator has not enabled crypto rails (GRESSPAY_CRYPTO_ALLOWED).';
            }
            if ($brand && empty($brand['crypto_enabled'])) {
                $liveReady = false;
                $reasons[] = 'Merchant crypto rails not enabled.';
            }
            $creds = BinancePayClient::credentialsForBrand($brand ?? []);
            if ($creds === null) {
                $liveReady = false;
                $reasons[] = 'Binance Pay merchant credentials not configured.';
            }
            return [
                'liveReady' => $liveReady,
                'reasons' => $reasons,
                'integrationType' => 'binance_pay_merchant',
                'label' => 'Binance Pay (official merchant API)',
            ];
        }

        if ($code === 'usdt_trc20') {
            if (!GpConfig::cryptoAllowed()) {
                $liveReady = false;
                $reasons[] = 'Operator has not enabled crypto rails (GRESSPAY_CRYPTO_ALLOWED).';
            }
            if ($brand && empty($brand['crypto_enabled'])) {
                $liveReady = false;
                $reasons[] = 'Merchant crypto rails not enabled.';
            }
            if ($account === '') {
                $liveReady = false;
                $reasons[] = 'USDT TRC-20 receiving address not configured.';
            }
            if (GpConfig::tronApiKey() === '' && !GpConfig::isDevelopment()) {
                // TronGrid often works without key with rate limits; warn but allow in dev.
                $reasons[] = 'TRON_API_KEY not set — verification may be rate-limited.';
            }
            return [
                'liveReady' => $liveReady,
                'reasons' => $reasons,
                'integrationType' => 'onchain_trc20',
                'label' => 'USDT TRC-20 on-chain verification',
            ];
        }

        return [
            'liveReady' => false,
            'reasons' => ['Unsupported method for this release.'],
            'integrationType' => $type,
            'label' => (string) $catalog['title'],
        ];
    }
}
