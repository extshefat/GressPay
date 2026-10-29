<?php
declare(strict_types=1);

final class GpRequest
{
    public string $method;
    /** @var string[] */
    public array $parts;
    public array $body;
    public string $raw;

    public function __construct(array $parts)
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $this->parts = $parts;
        $this->raw = (string) file_get_contents('php://input');
        $decoded = json_decode($this->raw, true);
        $this->body = is_array($decoded) ? $decoded : [];
    }

    public function part(int $i, ?string $default = null): ?string
    {
        return $this->parts[$i] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $_GET[$key] ?? $default;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public function bearer(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
            return $m[1];
        }
        return null;
    }

    public function apiKeyHeader(): ?string
    {
        foreach (['HTTP_X_GRESSPAY_KEY', 'HTTP_X_API_KEY'] as $name) {
            $key = $_SERVER[$name] ?? null;
            if (is_string($key) && trim($key) !== '') {
                return trim($key);
            }
        }
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        return is_string($auth) && trim($auth) !== '' ? trim($auth) : null;
    }

    /** Companion device token. X-Device-Token is an alias of X-GressPay-Device. */
    public function deviceToken(): ?string
    {
        foreach (['HTTP_X_GRESSPAY_DEVICE', 'HTTP_X_DEVICE_TOKEN'] as $name) {
            $token = $_SERVER[$name] ?? null;
            if (is_string($token) && trim($token) !== '') {
                return trim($token);
            }
        }
        return null;
    }
}
