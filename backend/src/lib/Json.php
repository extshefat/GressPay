<?php
declare(strict_types=1);

final class GpJson
{
    public static function send(array $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $code, string $message, int $status = 400): never
    {
        self::send(['error' => ['code' => $code, 'message' => $message]], $status);
    }

    public static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = GpConfig::corsOrigins();
        $star = in_array('*', $allowed, true);
        if ($origin !== '' && ($star || in_array($origin, $allowed, true))) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        } elseif ($star) {
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-GressPay-Key, X-API-Key, X-Device-Token, X-GressPay-Device, X-GressPay-Mode, X-GressPay-Brand');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
