<?php
declare(strict_types=1);

/**
 * Minimal hosted checkout — from this folder: php -S 0.0.0.0:8080
 *
 * Set GRESSPAY_API_KEY to your brand website key (gp_live_…).
 */

$apiKey = getenv('GRESSPAY_API_KEY') ?: '';
$apiBase = rtrim(getenv('GRESSPAY_API_BASE') ?: 'https://gresspay.extxcheats.com/api/v1', '/');

if ($apiKey === '') {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Set GRESSPAY_API_KEY to your brand website API key (Dashboard → Brands).\n";
    exit;
}

$host = ($_SERVER['HTTP_HOST'] ?? '127.0.0.1');
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$selfBase = $scheme . '://' . $host;

$payload = [
    'amount' => '500.00',
    'currency' => 'BDT',
    'order_id' => 'demo-' . bin2hex(random_bytes(4)),
    'customer_name' => 'Demo Buyer',
    'customer_email' => 'buyer@example.com',
    'success_url' => $selfBase . '/verify-return.php',
    'cancel_url' => $selfBase . '/create-payment.php?cancelled=1',
    'webhook_url' => getenv('GRESSPAY_WEBHOOK_URL') ?: 'https://your-server.example/hooks/gresspay.php',
    'metadata' => ['sample' => 'psp-minimal'],
];

$ch = curl_init($apiBase . '/payment/create');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
    CURLOPT_TIMEOUT => 30,
]);
$raw = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!is_string($raw)) {
    http_response_code(502);
    exit('Empty response from GressPay');
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(502);
    exit('Invalid JSON from GressPay (HTTP ' . $code . ')');
}

if ($code >= 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

$payUrl = $data['payment_url'] ?? $data['payUrl'] ?? null;
if (!is_string($payUrl) || $payUrl === '') {
    http_response_code(502);
    exit('Missing payment_url in response');
}

header('Location: ' . $payUrl, true, 302);
exit;
