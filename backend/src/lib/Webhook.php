<?php
declare(strict_types=1);

final class GpWebhook
{
    public static function secret(array $brand): string
    {
        if (!empty($brand['webhook_secret']) && $brand['webhook_secret'] !== '--') {
            $stored = (string) $brand['webhook_secret'];
            if (str_starts_with($stored, 'v1:')) {
                $plain = GpCrypto::open($stored);
                if ($plain === null) {
                    throw new RuntimeException('Webhook secret could not be decrypted.');
                }
                return $plain;
            }
            // Convert legacy plaintext secrets without rotating the merchant's key.
            GpDb::exec(
                'UPDATE gp_brands SET webhook_secret = ?, updated_at = ? WHERE brand_id = ? AND webhook_secret = ?',
                [GpCrypto::seal($stored), GpIds::now(), $brand['brand_id'], $stored]
            );
            return $stored;
        }
        $secret = 'gpwh_' . bin2hex(random_bytes(24));
        GpDb::exec('UPDATE gp_brands SET webhook_secret = ?, updated_at = ? WHERE brand_id = ?', [
            GpCrypto::seal($secret),
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
            $sessionId = (string) ($payload['transactionId'] ?? $payload['sessionId'] ?? '');
            $payload['eventId'] = $sessionId !== ''
                ? 'evt_' . hash('sha256', $sessionId . '|' . $event)
                : 'evt_' . bin2hex(random_bytes(12));
        }
        $payload['event'] = $event;
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $sig = self::sign($json, self::secret($brand));
        $timeout = GpConfig::webhookTimeoutSeconds();
        $code = self::postJson($target, $json, $sig, $event, $payload, $timeout);
        if ($code >= 200 && $code < 300) {
            self::logDelivery($brand, $payload, $target, $sig, $code, 'completed', $event);
            return $code;
        }
        $deliveryId = self::logDelivery($brand, $payload, $target, $sig, $code, 'pending', $event, 'attempt_failed_http_' . $code);
        $now = GpIds::now();
        GpDb::exec(
            'INSERT INTO gp_webhook_queue (webhook_delivery_id, brand_id, merchant_id, payload, endpoint_url, signing_secret, event_name, attempt_count, max_attempts, next_attempt_at, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$deliveryId, $brand['brand_id'], $brand['merchant_id'] ?? '', $json, $target, '', $event,
                1, GpConfig::webhookMaxRetries(), gmdate('Y-m-d\TH:i:s\Z', time() + 5), 'pending', $now, $now]
        );
        return 202;
    }

    /** @return list<array<string,mixed>> */
    public static function claimDueQueue(int $limit = 10): array
    {
        $now = GpIds::now();
        $stale = gmdate('Y-m-d\TH:i:s\Z', time() - 300);
        GpDb::exec("UPDATE gp_webhook_queue SET status = 'pending', updated_at = ? WHERE status = 'processing' AND updated_at < ?", [$now, $stale]);
        $rows = GpDb::all(
            "SELECT * FROM gp_webhook_queue WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at ASC, id ASC LIMIT " . max(1, min(100, $limit)),
            [$now]
        );
        $claimed = [];
        foreach ($rows as $row) {
            if (GpDb::exec(
                "UPDATE gp_webhook_queue SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'",
                [$now, $row['id']]
            ) === 1) {
                $claimed[] = $row;
            }
        }
        return $claimed;
    }

    /** @param array<string,mixed> $row */
    public static function processQueueRow(array $row): void
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
        $payload = json_decode((string) $row['payload'], true);
        $url = (string) $row['endpoint_url'];
        $event = (string) $row['event_name'];
        $check = self::validateDestination($url);
        $attempt = (int) $row['attempt_count'] + 1;
        $code = 0;
        $sig = '';
        if ($brand !== null && is_array($payload) && $check['ok']) {
            $sig = self::sign((string) $row['payload'], self::secret($brand));
            $code = self::postJson($url, (string) $row['payload'], $sig, $event, $payload, GpConfig::webhookTimeoutSeconds());
            self::logDelivery($brand, $payload, $url, $sig, $code,
                $code >= 200 && $code < 300 ? 'completed' : 'pending', $event,
                $code >= 200 && $code < 300 ? 'succeeded_after_retry' : 'attempt_failed_http_' . $code, $attempt);
        }
        $success = $code >= 200 && $code < 300;
        $failed = !$success && ($attempt >= (int) $row['max_attempts'] || $brand === null || !is_array($payload) || !$check['ok']);
        $next = gmdate('Y-m-d\TH:i:s\Z', time() + min(3600, 5 * (2 ** min(9, $attempt))));
        GpDb::exec(
            'UPDATE gp_webhook_queue SET attempt_count = ?, status = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ? AND status = ?',
            [$attempt, $success ? 'delivered' : ($failed ? 'failed' : 'pending'), $next,
                $success ? null : ($check['error'] ?? ($brand === null ? 'brand_missing' : 'http_' . $code)),
                GpIds::now(), $row['id'], 'processing']
        );
    }

    private static function postJson(
        string $target,
        string $json,
        string $sig,
        string $event,
        array $payload,
        int $timeout
    ): int {
        if (!function_exists('curl_init')) {
            return 0;
        }
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
            CURLOPT_CONNECTTIMEOUT => min(4, $timeout),
            CURLOPT_TIMEOUT => $timeout,
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
        string $note = '',
        int $attempt = 1
    ): int {
        $now = GpIds::now();
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $eventId = (string) ($payload['eventId'] ?? '');
        $sessionId = $payload['transactionId'] ?? ($payload['sessionId'] ?? null);

        $deliveryId = 0;
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
                    $attempt,
                    $now,
                    $now,
                ]
            );
            $deliveryId = (int) GpDb::pdo()->lastInsertId();
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
        return $deliveryId;
    }
}
