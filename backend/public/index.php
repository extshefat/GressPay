<?php
declare(strict_types=1);

if (PHP_SAPI === 'cli-server') {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $file = __DIR__ . $path;
    if ($path !== '/' && is_file($file)) {
        return false;
    }
}

require dirname(__DIR__) . '/src/bootstrap.php';

try {
    GpRouter::dispatch();
} catch (Throwable $e) {
    error_log('GressPay: ' . $e->getMessage());
    $detail = trim(preg_replace('/\s+/', ' ', $e->getMessage()) ?? '');
    if (strlen($detail) > 240) {
        $detail = substr($detail, 0, 240) . '…';
    }
    $message = $detail !== '' ? $detail : 'Unexpected error.';
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'SERVER_ERROR',
            'message' => $message,
        ],
    ], JSON_UNESCAPED_SLASHES);
}
