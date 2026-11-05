<?php
declare(strict_types=1);

/**
 * SSRF-hardened HTTPS client: resolve once, pin via CURLOPT_RESOLVE, no redirects.
 */
final class GpSafeHttp
{
    private const MAX_BYTES = 1048576; // 1 MiB
    private const TIMEOUT = 8;

    /**
     * @return array{ok:bool,error?:string,host?:string,ip?:string,url?:string}
     */
    public static function validateUrl(string $url, ?array $hostAllowlist = null): array
    {
        $url = trim($url);
        if ($url === '') {
            return ['ok' => false, 'error' => 'empty'];
        }
        $parts = parse_url($url);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            return ['ok' => false, 'error' => 'invalid_url'];
        }
        if (!empty($parts['user']) || !empty($parts['pass'])) {
            return ['ok' => false, 'error' => 'userinfo_forbidden'];
        }
        if (strtolower((string) $parts['scheme']) !== 'https') {
            return ['ok' => false, 'error' => 'https_required'];
        }
        $port = isset($parts['port']) ? (int) $parts['port'] : 443;
        if ($port !== 443) {
            return ['ok' => false, 'error' => 'port_forbidden'];
        }
        $host = strtolower((string) $parts['host']);
        if ($hostAllowlist !== null) {
            $allowed = false;
            foreach ($hostAllowlist as $suffix) {
                $suffix = strtolower((string) $suffix);
                if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                    $allowed = true;
                    break;
                }
            }
            if (!$allowed) {
                return ['ok' => false, 'error' => 'host_not_allowed', 'host' => $host];
            }
        }
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || $host === '0.0.0.0') {
            return ['ok' => false, 'error' => 'blocked_host'];
        }
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (GpWebhook::isBlockedIp($host)) {
                return ['ok' => false, 'error' => 'blocked_ip', 'host' => $host, 'ip' => $host];
            }
            return ['ok' => true, 'host' => $host, 'ip' => $host, 'url' => $url];
        }
        $ips = self::resolveHost($host);
        if ($ips === []) {
            return ['ok' => false, 'error' => 'dns_failed', 'host' => $host];
        }
        foreach ($ips as $ip) {
            if (GpWebhook::isBlockedIp($ip)) {
                return ['ok' => false, 'error' => 'blocked_ip', 'host' => $host, 'ip' => $ip];
            }
        }
        return ['ok' => true, 'host' => $host, 'ip' => $ips[0], 'url' => $url];
    }

    /**
     * Discord Incoming Webhook URLs only.
     * @return array{ok:bool,error?:string,host?:string,ip?:string,url?:string}
     */
    public static function validateDiscordWebhook(string $url): array
    {
        $check = self::validateUrl($url, ['discord.com', 'discordapp.com']);
        if (!$check['ok']) {
            return $check;
        }
        $path = (string) (parse_url($url, PHP_URL_PATH) ?? '');
        if (!preg_match('#^/api/webhooks/\d+/[A-Za-z0-9_-]+/?$#', $path)) {
            return ['ok' => false, 'error' => 'discord_path_invalid'];
        }
        return $check;
    }

    /**
     * @return array{ok:bool,status?:int,body?:string,error?:string}
     */
    public static function postJson(string $url, string $json, array $extraHeaders = [], ?array $hostAllowlist = null): array
    {
        $check = self::validateUrl($url, $hostAllowlist);
        if (!$check['ok']) {
            return ['ok' => false, 'error' => (string) ($check['error'] ?? 'blocked'), 'status' => 0];
        }
        $host = (string) $check['host'];
        $ip = (string) $check['ip'];
        $ch = curl_init($url);
        if ($ch === false) {
            return ['ok' => false, 'error' => 'curl_init', 'status' => 0];
        }
        $headers = array_merge(['Content-Type: application/json', 'Accept: application/json'], $extraHeaders);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_TIMEOUT => self::TIMEOUT,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => 0,
            CURLOPT_MAXREDIRS => 0,
            CURLOPT_RESOLVE => [$host . ':443:' . $ip],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false) {
            return ['ok' => false, 'error' => $err !== '' ? $err : 'curl_failed', 'status' => $status];
        }
        if (strlen($body) > self::MAX_BYTES) {
            $body = substr($body, 0, self::MAX_BYTES);
        }
        return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => $body];
    }

    /** @return list<string> */
    private static function resolveHost(string $host): array
    {
        $ips = [];
        $a = @dns_get_record($host, DNS_A);
        if (is_array($a)) {
            foreach ($a as $rec) {
                if (!empty($rec['ip'])) {
                    $ips[] = $rec['ip'];
                }
            }
        }
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (!empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
        }
        if ($ips === []) {
            $resolved = gethostbyname($host);
            if ($resolved !== $host && filter_var($resolved, FILTER_VALIDATE_IP)) {
                $ips[] = $resolved;
            }
        }
        return array_values(array_unique($ips));
    }
}
