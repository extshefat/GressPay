<?php
declare(strict_types=1);

/**
 * Binance Pay Merchant API client (not Spot trading).
 * Signing: HMAC-SHA512 over timestamp + "\n" + nonce + "\n" + body + "\n"
 * @see https://developers.binance.com/docs/binance-pay/api-common
 */
final class BinancePayClient
{
    /**
     * @param array<string,mixed> $brand
     * @return array{apiKey:string,secret:string,certificateSn:string}|null
     */
    public static function credentialsForBrand(array $brand): ?array
    {
        // Merchant Binance Pay credentials are sealed per brand only.
        // Never fall back to platform .env keys (multi-tenant isolation).
        $json = (string) ($brand['binance_pay_json'] ?? '');
        if ($json === '') {
            return null;
        }
        $opened = GpCrypto::open($json);
        if ($opened === null) {
            return null;
        }
        $decoded = json_decode($opened, true);
        if (!is_array($decoded)
            || empty($decoded['apiKey'])
            || empty($decoded['secret'])
            || empty($decoded['certificateSn'])
        ) {
            return null;
        }
        return [
            'apiKey' => (string) $decoded['apiKey'],
            'secret' => (string) $decoded['secret'],
            'certificateSn' => (string) $decoded['certificateSn'],
        ];
    }

    /** True when this brand has sealed Binance Pay JSON (does not open secrets). */
    public static function brandHasSealedCredentials(array $brand): bool
    {
        return trim((string) ($brand['binance_pay_json'] ?? '')) !== '';
    }

    /** Build official payload signature (for tests + requests). */
    public static function signPayload(string $timestamp, string $nonce, string $body, string $secret): string
    {
        $payload = $timestamp . "\n" . $nonce . "\n" . $body . "\n";
        return strtoupper(hash_hmac('sha512', $payload, $secret));
    }

    public static function verifyCallbackSignature(
        string $timestamp,
        string $nonce,
        string $body,
        string $signature,
        string $secret
    ): bool {
        if ($timestamp === '' || $nonce === '' || $signature === '') {
            return false;
        }
        // Reject stale callbacks (>5 minutes).
        if (abs(time() * 1000 - (int) $timestamp) > 300000) {
            return false;
        }
        $expected = self::signPayload($timestamp, $nonce, $body, $secret);
        return hash_equals($expected, strtoupper($signature));
    }

    /**
     * @param array{apiKey:string,secret:string,certificateSn:string} $creds
     * @param array<string,mixed> $body
     * @return array{ok:bool,http:int,data?:array,error?:string,raw?:string}
     */
    public static function request(array $creds, string $path, array $body): array
    {
        $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $timestamp = (string) (int) round(microtime(true) * 1000);
        $nonce = bin2hex(random_bytes(16));
        $sig = self::signPayload($timestamp, $nonce, $json, $creds['secret']);
        $url = GpConfig::binancePayBase() . $path;

        if (!function_exists('curl_init')) {
            return ['ok' => false, 'http' => 0, 'error' => 'curl_missing'];
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'BinancePay-Timestamp: ' . $timestamp,
                'BinancePay-Nonce: ' . $nonce,
                'BinancePay-Certificate-SN: ' . $creds['certificateSn'],
                'BinancePay-Signature: ' . $sig,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);
        $raw = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'http' => $http, 'error' => $err !== '' ? $err : 'network_error'];
        }
        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return ['ok' => false, 'http' => $http, 'error' => 'invalid_json', 'raw' => ''];
        }
        $status = strtoupper((string) ($decoded['status'] ?? ''));
        if ($status !== 'SUCCESS' && $http >= 400) {
            return [
                'ok' => false,
                'http' => $http,
                'data' => $decoded,
                'error' => (string) ($decoded['errorMessage'] ?? $decoded['code'] ?? 'provider_error'),
            ];
        }
        return ['ok' => $status === 'SUCCESS', 'http' => $http, 'data' => $decoded];
    }

    /**
     * @param array{apiKey:string,secret:string,certificateSn:string} $creds
     * @return array{ok:bool,http:int,data?:array,error?:string}
     */
    public static function createOrder(array $creds, string $merchantTradeNo, string $amount, string $currency, string $description): array
    {
        $body = [
            'env' => ['terminalType' => 'WEB'],
            'merchantTradeNo' => $merchantTradeNo,
            'orderAmount' => (float) $amount,
            'currency' => strtoupper($currency),
            'description' => $description !== '' ? $description : 'GressPay checkout',
            'goodsDetails' => [[
                'goodsType' => '01',
                'goodsCategory' => 'Z000',
                'referenceGoodsId' => $merchantTradeNo,
                'goodsName' => $description !== '' ? mb_substr($description, 0, 64) : 'Payment',
            ]],
        ];
        return self::request($creds, '/binancepay/openapi/v2/order', $body);
    }

    /**
     * @param array{apiKey:string,secret:string,certificateSn:string} $creds
     * @return array{ok:bool,http:int,data?:array,error?:string}
     */
    public static function queryOrder(array $creds, string $merchantTradeNo): array
    {
        return self::request($creds, '/binancepay/openapi/v2/order/query', [
            'merchantTradeNo' => $merchantTradeNo,
        ]);
    }

    /**
     * Query Order documents totalFee as the paid amount. orderAmount is accepted
     * only when totalFee is absent or the two values match. Missing or conflicting
     * amounts must not be treated as paid.
     *
     * @param array<string,mixed> $data
     * @return array{ok:bool,amount?:string,error?:string}
     */
    public static function resolvePaidAmount(array $data): array
    {
        $fee = trim((string) ($data['totalFee'] ?? ''));
        $order = trim((string) ($data['orderAmount'] ?? ''));
        if ($fee === '' && $order === '') {
            return ['ok' => false, 'error' => 'Provider amount missing.'];
        }
        if ($fee !== '' && $order !== '') {
            $feeAmount = GpMoney::sanitize($fee, 8);
            $orderAmount = GpMoney::sanitize($order, 8);
            if (!GpMoney::withinTolerance($feeAmount, $orderAmount, '0', 8)) {
                return ['ok' => false, 'error' => 'Provider totalFee and orderAmount disagree.'];
            }
            return ['ok' => true, 'amount' => $feeAmount];
        }
        return ['ok' => true, 'amount' => GpMoney::sanitize($fee !== '' ? $fee : $order, 8)];
    }
}
