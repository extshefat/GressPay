<?php
declare(strict_types=1);

/**
 * Minimal GressPay merchant client (create hosted checkout + verify status).
 *
 * Environment:
 *   GRESSPAY_API_KEY
 *   GRESSPAY_CHECKOUT_URL  (default: https://gresspay.extxcheats.com/api/v1/payment/create)
 *   GRESSPAY_VERIFY_URL    (default: https://gresspay.extxcheats.com/api/v1/payment/verify)
 */
final class GressPayClient
{
    private string $apiKey;
    private string $createUrl;
    private string $verifyUrl;

    public function __construct(?string $apiKey = null, ?string $createUrl = null, ?string $verifyUrl = null)
    {
        $this->apiKey = $apiKey ?? (getenv('GRESSPAY_API_KEY') ?: '');
        $this->createUrl = $createUrl ?? (getenv('GRESSPAY_CHECKOUT_URL') ?: 'https://gresspay.extxcheats.com/api/v1/payment/create');
        $this->verifyUrl = $verifyUrl ?? (getenv('GRESSPAY_VERIFY_URL') ?: 'https://gresspay.extxcheats.com/api/v1/payment/verify');
        if ($this->apiKey === '') {
            throw new InvalidArgumentException('GRESSPAY_API_KEY is required');
        }
    }

    /** @param array<string,mixed> $payload */
    public function createPayment(array $payload): array
    {
        return $this->postJson($this->createUrl, $payload);
    }

    public function verifyPayment(string $sessionId): array
    {
        return $this->postJson($this->verifyUrl, ['sessionId' => $sessionId]);
    }

    /** @param array<string,mixed> $body */
    private function postJson(string $url, array $body): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('curl_init failed');
        }
        $json = json_encode($body, JSON_THROW_ON_ERROR);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (!is_string($raw)) {
            throw new RuntimeException('Empty response from GressPay API');
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new RuntimeException('Invalid JSON from GressPay API (HTTP ' . $code . ')');
        }
        if ($code >= 400) {
            $msg = (string) ($data['message'] ?? $data['error'] ?? 'API error');
            throw new RuntimeException($msg . ' (HTTP ' . $code . ')');
        }
        return $data;
    }
}
