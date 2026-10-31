<?php
declare(strict_types=1);

/**
 * Lightweight GressPay REST client for WordPress (no Composer required).
 */
final class GressPay_WC_Client
{
    private string $apiKey;
    private string $createUrl;
    private string $verifyUrl;

    public function __construct(string $apiKey, ?string $createUrl = null, ?string $verifyUrl = null)
    {
        $this->apiKey = $apiKey;
        $this->createUrl = $createUrl ?: 'https://gresspay.extxcheats.com/api/v1/payment/create';
        $this->verifyUrl = $verifyUrl ?: 'https://gresspay.extxcheats.com/api/v1/payment/verify';
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
        $response = wp_remote_post($url, [
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode($body),
        ]);
        if (is_wp_error($response)) {
            throw new RuntimeException($response->get_error_message());
        }
        $code = (int) wp_remote_retrieve_response_code($response);
        $raw = (string) wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new RuntimeException('Invalid JSON from GressPay (HTTP ' . $code . ')');
        }
        if ($code >= 400) {
            $msg = (string) ($data['message'] ?? ($data['error']['message'] ?? 'API error'));
            throw new RuntimeException($msg . ' (HTTP ' . $code . ')');
        }
        return $data;
    }
}
