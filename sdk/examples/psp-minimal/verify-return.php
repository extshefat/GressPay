<?php
declare(strict_types=1);

/**
 * Buyer return URL — verify server-side before showing success.
 * GressPay may append session id query params; adjust names to match your checkout links.
 */

$apiKey = getenv('GRESSPAY_API_KEY') ?: '';
$apiBase = rtrim(getenv('GRESSPAY_API_BASE') ?: 'https://gresspay.extxcheats.com/api/v1', '/');

$sessionId = $_GET['sessionId'] ?? $_GET['session_id'] ?? $_GET['chs'] ?? '';
if ($sessionId === '' || $apiKey === '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Missing session id or GRESSPAY_API_KEY.\n";
    exit;
}

$ch = curl_init($apiBase . '/payment/verify');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode(['sessionId' => $sessionId], JSON_THROW_ON_ERROR),
    CURLOPT_TIMEOUT => 30,
]);
$raw = curl_exec($ch);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
if (!is_string($raw)) {
    http_response_code(502);
    echo json_encode(['error' => 'verify_failed']);
    exit;
}

$data = json_decode($raw, true);
echo json_encode($data, JSON_PRETTY_PRINT);
