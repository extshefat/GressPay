<?php
declare(strict_types=1);

/**
 * GressPay webhook endpoint — deploy behind HTTPS.
 * Set GRESSPAY_WEBHOOK_SECRET (gpwh_…) from your account dashboard.
 */

$secret = getenv('GRESSPAY_WEBHOOK_SECRET') ?: '';
if ($secret === '') {
    http_response_code(500);
    exit('webhook secret not configured');
}

$rawBody = file_get_contents('php://input');
if (!is_string($rawBody)) {
    http_response_code(400);
    exit('empty body');
}

$signature = $_SERVER['HTTP_X_GRESSPAY_SIGNATURE'] ?? '';
$expected = hash_hmac('sha256', $rawBody, $secret);

if ($signature === '' || !hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('invalid signature');
}

/** @var array<string,mixed> $event */
$event = json_decode($rawBody, true);
if (!is_array($event)) {
    http_response_code(400);
    exit('invalid json');
}

if (($event['status'] ?? '') === 'COMPLETED') {
    // TODO: idempotent fulfill — use transactionId / order_id from metadata
    // error_log('GressPay paid: ' . ($event['transactionId'] ?? ''));
}

http_response_code(200);
header('Content-Type: application/json');
echo json_encode(['received' => true]);
