<?php
declare(strict_types=1);

/**
 * Resolve the client IP only when REMOTE_ADDR is a trusted proxy.
 * Prefer X-GressPay-Client-IP (set by the Next BFF). Otherwise count hops
 * from the right of X-Forwarded-For — never trust the leftmost value.
 */
final class GpClientIp
{
    public static function resolve(): string
    {
        $remote = trim((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
        if ($remote === '') {
            $remote = '0.0.0.0';
        }

        if (!self::isTrustedProxy($remote)) {
            return self::normalizeIp($remote);
        }

        $appHeader = trim((string) ($_SERVER['HTTP_X_GRESSPAY_CLIENT_IP'] ?? ''));
        if ($appHeader !== '' && filter_var($appHeader, FILTER_VALIDATE_IP)) {
            return self::normalizeIp($appHeader);
        }

        $xff = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
        if ($xff !== '') {
            $parts = array_values(array_filter(array_map('trim', explode(',', $xff)), static fn ($p) => $p !== ''));
            if ($parts !== []) {
                $hops = max(1, (int) GpConfig::get('TRUSTED_PROXY_HOPS', '1'));
                // From the right: last hop is typically the immediate proxy; client is hops from the end.
                $idx = count($parts) - $hops;
                if ($idx < 0) {
                    $idx = 0;
                }
                $candidate = $parts[$idx];
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return self::normalizeIp($candidate);
                }
            }
        }

        return self::normalizeIp($remote);
    }

    public static function isTrustedProxy(string $ip): bool
    {
        $ip = self::normalizeIp($ip);
        $raw = trim(GpConfig::get('TRUSTED_PROXIES', ''));
        // Default trust: private Docker/Coolify peers when unset (compose network).
        if ($raw === '') {
            $raw = '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32,::1/128';
        }
        foreach (explode(',', $raw) as $cidr) {
            $cidr = trim($cidr);
            if ($cidr === '') {
                continue;
            }
            if (self::ipInCidr($ip, $cidr)) {
                return true;
            }
        }
        return false;
    }

    public static function normalizeIp(string $ip): string
    {
        $ip = trim($ip);
        if (str_starts_with($ip, '::ffff:')) {
            $v4 = substr($ip, 7);
            if (filter_var($v4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $v4;
            }
        }
        return $ip;
    }

    public static function ipInCidr(string $ip, string $cidr): bool
    {
        if (!str_contains($cidr, '/')) {
            return $ip === $cidr || (filter_var($cidr, FILTER_VALIDATE_IP) && $ip === self::normalizeIp($cidr));
        }
        [$subnet, $mask] = explode('/', $cidr, 2);
        $mask = (int) $mask;
        $ipBin = @inet_pton($ip);
        $subBin = @inet_pton($subnet);
        if ($ipBin === false || $subBin === false || strlen($ipBin) !== strlen($subBin)) {
            return false;
        }
        $len = strlen($ipBin);
        $bits = $len * 8;
        if ($mask < 0 || $mask > $bits) {
            return false;
        }
        $fullBytes = intdiv($mask, 8);
        $rem = $mask % 8;
        if ($fullBytes > 0 && substr($ipBin, 0, $fullBytes) !== substr($subBin, 0, $fullBytes)) {
            return false;
        }
        if ($rem === 0) {
            return true;
        }
        $maskByte = chr((0xFF << (8 - $rem)) & 0xFF);
        return ($ipBin[$fullBytes] & $maskByte) === ($subBin[$fullBytes] & $maskByte);
    }
}
