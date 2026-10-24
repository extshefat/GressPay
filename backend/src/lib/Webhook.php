<?php
declare(strict_types=1);

final class GpWebhook
{
    public static function secret(array $brand): string
    {
        if (!empty($brand['webhook_secret']) && $brand['webhook_secret'] !== '--') {
            return (string) $brand['webhook_secret'];
        }
        $secret = 'gpwh_' . bin2hex(random_bytes(24));
        GpDb::exec('UPDATE gp_brands SET webhook_secret = ?, updated_at = ? WHERE brand_id = ?', [
            $secret,
            GpIds::now(),
            $brand['brand_id'],
        ]);
        return $secret;
    }

    public static function sign(string $payload, string $secret): string
    {
        return hash_hmac('sha256', $payload, $secret);
    }

    /**
     * Validate merchant webhook destination. Blocks SSRF to private/link-local/metadata.
     * @return array{ok:bool,error?:string,host?:string,ip?:string}
     */
    public static function validateDestination(string $url): array
    {
        $url = trim($url);
        if ($url === '' || $url === '--') {
            return ['ok' => false, 'error' => 'empty'];
        }
        $parts = parse_url($url);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            return ['ok' => false, 'error' => 'invalid_url'];
        }
        if (strtolower($parts['scheme']) !== 'https') {
            return ['ok' => false, 'error' => 'https_required'];
        }
        $host = strtolower((string) $parts['host']);
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || $host === '0.0.0.0') {
            return ['ok' => false, 'error' => 'blocked_host'];
        }
        // Reject literal IPs that are private before DNS.
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (self::isBlockedIp($host)) {
                return ['ok' => false, 'error' => 'blocked_ip'];
            }
            return ['ok' => true, 'host' => $host, 'ip' => $host];
        }
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
        if ($ips === []) {
            return ['ok' => false, 'error' => 'dns_failed'];
        }
        foreach ($ips as $ip) {
            if (self::isBlockedIp($ip)) {
                return ['ok' => false, 'error' => 'blocked_ip', 'host' => $host, 'ip' => $ip];
            }
        }
        return ['ok' => true, 'host' => $host, 'ip' => $ips[0]];
    }

    public static function isBlockedIp(string $ip): bool
    {
        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return true;
        }
        // IPv4 private / loopback / link-local / CGNAT / metadata-ish
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $long = ip2long($ip);
            if ($long === false) {
                return true;
            }
            $ranges = [
                ['0.0.0.0', '0.255.255.255'],
                ['10.0.0.0', '10.255.255.255'],
                ['100.64.0.0', '100.127.255.255'],
                ['127.0.0.0', '127.255.255.255'],
                ['169.254.0.0', '169.254.255.255'],
                ['172.16.0.0', '172.31.255.255'],
                ['192.0.0.0', '192.0.0.255'],
                ['192.168.0.0', '192.168.255.255'],
                ['198.18.0.0', '198.19.255.255'],
                ['224.0.0.0', '255.255.255.255'],
            ];
            foreach ($ranges as [$start, $end]) {
                if ($long >= ip2long($start) && $long <= ip2long($end)) {
                    return true;
                }
            }
            // Cloud metadata common IP
            if ($ip === '169.254.169.254') {
                return true;
            }
            return false;
        }
        // IPv6: loopback, link-local, ULA, multicast
        $lower = strtolower($ip);
        if ($lower === '::1' || str_starts_with($lower, 'fc') || str_starts_with($lower, 'fd')
            || str_starts_with($lower, 'fe80') || str_starts_with($lower, 'ff')) {
            return true;
        }
        return false;
    }

    public static function dispatch(array $brand, ?string $url, array $payload, string $event = 'payment.completed'): int
    {
        $target = $url ?: ($brand['webhook_url'] ?? '');
        if ($target === '' || $target === '--') {
            return 0;
        }

        $check = self::validateDestination($target);
        if (!$check['ok']) {
            self::logDelivery($brand, $payload, $target, '', 0, 'blocked', $event, (string) ($check['error'] ?? 'blocked'));
            return 0;
        }

        if (empty($payload['eventId'])) {
            $payload['eventId'] = 'evt_' . bin2hex(random_bytes(12));
        }
        $payload['event'] = $event;
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $sig = self::sign($json, self::secret($brand));
        $code = 0;
        $status = 'pending';

        if (function_exists('curl_init')) {
            $ch = curl_init($target);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $json,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'X-GressPay-Signature: ' . $sig,
                    'X-GressPay-Event: ' . $event,
                    'X-GressPay-Event-Id: ' . ($payload['eventId'] ?? ''),
                    'User-Agent: GressPay-Webhook/1.0',
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 4,
                CURLOPT_TIMEOUT => 8,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
                CURLOPT_REDIR_PROTOCOLS => 0,
                CURLOPT_MAXREDIRS => 0,
            ]);
            curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $status = ($code >= 200 && $code < 300) ? 'completed' : 'pending';
        }

        self::logDelivery($brand, $payload, $target, $sig, $code, $status, $event);
        return $code;
    }

    /** @param array<string,mixed> $payload */
    private static function logDelivery(
        array $brand,
        array $payload,
        string $target,
        string $sig,
        int $code,
        string $status,
        string $event,
        string $note = ''
    ): void {
        $now = GpIds::now();
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $eventId = (string) ($payload['eventId'] ?? '');
        $sessionId = $payload['transactionId'] ?? ($payload['sessionId'] ?? null);

        try {
            GpDb::exec(
                'INSERT INTO gp_webhook_deliveries
                 (event_id, brand_id, session_id, event_name, url, payload, signature, http_code, status, note, attempt, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $eventId !== '' ? $eventId : ('evt_' . bin2hex(random_bytes(8))),
                    $brand['brand_id'],
                    $sessionId,
                    $event,
                    $target,
                    $json,
                    $sig,
                    $code,
                    $status,
                    $note,
                    1,
                    $now,
                    $now,
                ]
            );
        } catch (Throwable $e) {
            // fall through to legacy log
        }

        GpDb::exec(
            'INSERT INTO gp_webhook_log (brand_id, session_id, url, payload, signature, http_code, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $brand['brand_id'],
                $sessionId,
                $target,
                $json,
                $sig,
                $code,
                $status,
                $now,
                $now,
            ]
        );
    }
}
