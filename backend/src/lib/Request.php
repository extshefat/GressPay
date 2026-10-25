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
        return $_SERVER['HTTP_X_GRESSPAY_KEY'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;
    }
}
