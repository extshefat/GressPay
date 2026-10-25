<?php
declare(strict_types=1);

final class GpIds
{
    public static function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    public static function make(string $prefix, int $bytes = 10): string
    {
        return $prefix . '_' . bin2hex(random_bytes($bytes));
    }

    public static function defaultScopes(): string
    {
        return json_encode([
            'create_payment',
            'verify_payment',
            'read_transactions',
            'manage_links',
            'manage_invoices',
            'manage_methods',
            'manage_devices',
            'manage_provider',
        ], JSON_UNESCAPED_SLASHES);
    }
}
