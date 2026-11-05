<?php
declare(strict_types=1);
/** Compatibility entrypoint; use the same fail-closed trust policy as all rate limits. */
final class GpClientIp
{
    public static function resolve(): string { return GpRateLimiter::ip(); }
    public static function isTrustedProxy(string $ip): bool { return GpRateLimiter::trusted($ip, 'TRUSTED_PROXIES'); }
    public static function normalizeIp(string $ip): string {
        $bytes=@inet_pton(trim($ip));
        if ($bytes===false) return '0.0.0.0';
        if (strlen($bytes)===16 && substr($bytes,0,12)===str_repeat("\0",10)."\xff\xff") return (string)inet_ntop(substr($bytes,12));
        return (string)inet_ntop($bytes);
    }
    public static function ipInCidr(string $ip,string $cidr): bool { return GpRateLimiter::inCidr($ip,$cidr); }
}
