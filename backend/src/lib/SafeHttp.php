<?php
declare(strict_types=1);

/** Merchant-controlled HTTPS destinations. Resolve once, validate all answers, pin one. */
final class GpSafeHttp
{
    public static function isBlockedIp(string $ip): bool
    {
        $bytes = @inet_pton($ip);
        if ($bytes === false) return true;
        if (strlen($bytes) === 16) {
            // Normalize mapped IPv4 before range checks (including alternate textual spellings).
            if (substr($bytes, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
                return self::isBlockedIp((string) inet_ntop(substr($bytes, 12)));
            }
            if (!GpRateLimiter::inCidr($ip, '2000::/3')) return true;
            foreach (['2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20'] as $cidr) {
                if (GpRateLimiter::inCidr($ip, $cidr)) return true;
            }
            return false;
        }
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return true;
        foreach (['0.0.0.0/8','100.64.0.0/10','192.0.0.0/24','192.0.2.0/24','192.88.99.0/24','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24','224.0.0.0/4','240.0.0.0/4'] as $cidr) {
            if (GpRateLimiter::inCidr($ip, $cidr)) return true;
        }
        return false;
    }

    public static function destination(string $url): array
    {
        $parts = parse_url($url);
        if (!$parts || strtolower((string) ($parts['scheme'] ?? '')) !== 'https' || empty($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || preg_match('/[\x00-\x20\x7f]/', $url)) {
            return ['ok' => false, 'error' => 'invalid_https_url'];
        }
        $port = (int) ($parts['port'] ?? 443);
        $ports = array_map('intval', explode(',', GpConfig::get('SAFE_HTTP_PORTS', '443')));
        if (!in_array($port, $ports, true)) return ['ok' => false, 'error' => 'blocked_port'];
        $host = strtolower(trim($parts['host'], '[]'));
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips[] = $host;
        } else {
            if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D', $host)) return ['ok' => false, 'error' => 'invalid_host'];
            foreach (@dns_get_record($host, DNS_A | DNS_AAAA) ?: [] as $record) {
                if (isset($record['ip'])) $ips[] = $record['ip'];
                if (isset($record['ipv6'])) $ips[] = $record['ipv6'];
            }
        }
        if ($ips === []) return ['ok' => false, 'error' => 'dns_failed'];
        foreach ($ips as $ip) if (self::isBlockedIp($ip)) return ['ok' => false, 'error' => 'blocked_ip'];
        return ['ok' => true, 'url' => $url, 'host' => $host, 'port' => $port, 'ip' => $ips[0]];
    }

    public static function discordUrl(string $url): bool
    {
        $p = parse_url($url);
        return is_array($p) && ($p['scheme'] ?? '') === 'https'
            && in_array(strtolower($p['host'] ?? ''), ['discord.com', 'discordapp.com'], true)
            && !isset($p['user'], $p['pass']) && !isset($p['user']) && !isset($p['pass'])
            && (int) ($p['port'] ?? 443) === 443 && !isset($p['query']) && !isset($p['fragment'])
            && preg_match('#^/api(?:/v[0-9]+)?/webhooks/[0-9]+/[A-Za-z0-9_-]+$#D', $p['path'] ?? '') === 1;
    }

    public static function post(string $url, string $json, array $headers = [], int $timeout = 8, ?array $destination = null): array
    {
        $check = $destination ?? self::destination($url);
        if (empty($check['ok']) || ($check['url'] ?? '') !== $url || !function_exists('curl_init')) return ['code' => 0];
        // CONNECT proxies resolve remotely: CURLOPT_RESOLVE alone cannot pin that connection.
        // Fail closed rather than bypass an inherited egress proxy or silently lose pinning.
        foreach (['HTTPS_PROXY','https_proxy','ALL_PROXY','all_proxy'] as $name) {
            if (getenv($name)) return ['code' => 0];
        }
        $ch = curl_init($url);
        $size = 0;
        $ip = str_contains($check['ip'], ':') ? '[' . $check['ip'] . ']' : $check['ip'];
        curl_setopt_array($ch, [
            CURLOPT_POST => true, CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_RESOLVE => [$check['host'] . ':' . $check['port'] . ':' . $ip],
            CURLOPT_CONNECTTIMEOUT => min(4, $timeout), CURLOPT_TIMEOUT => min(15, max(1, $timeout)),
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_MAXREDIRS => 0,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => 0,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$size): int {
                $size += strlen($chunk);
                return $size > 65536 ? 0 : strlen($chunk);
            },
        ]);
        $ok = curl_exec($ch);
        $code = $ok === false ? 0 : (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['code' => $code];
    }
}
