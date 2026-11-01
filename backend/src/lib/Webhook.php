<?php
declare(strict_types=1);

final class GpWebhook
{
    /** @var list<int> seconds after failed attempt N (1-indexed failure count) */
    private const BACKOFF_SECONDS = [30, 120, 600, 1800, 7200];

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

    /** Exponential backoff after a failed attempt (attemptCount after increment). */
    public static function backoffSeconds(int $attemptCount): int
    {
        if ($attemptCount < 1) {
            return self::BACKOFF_SECONDS[0];
        }
        $idx = min($attemptCount - 1, count(self::BACKOFF_SECONDS) - 1);
        return self::BACKOFF_SECONDS[$idx];
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
            if ($ip === '169.254.169.254') {
                return true;
            }
            return false;
        }
        $lower = strtolower($ip);
        if ($lower === '::1' || str_starts_with($lower, 'fc') || str_starts_with($lower, 'fd')
            || str_starts_with($lower, 'fe80') || str_starts_with($lower, 'ff')) {
            return true;
        }
        return false;
    }

    /**
     * Enqueue webhook for async delivery. Does NOT retry in-process.
     * Returns 202 when queued, 0 when blocked/skipped.
     */
    public static function dispatch(array $brand, ?string $url, array $payload, string $event = 'payment.completed'): int
    {
        $target = $url ?: ($brand['webhook_url'] ?? '');
        if ($target === '' || $target === '--') {
            return 0;
        }

        $check = self::validateDestination($target);
        if (!$check['ok']) {
            self::logDelivery($brand, $payload, $target, '', 0, 'blocked', $event, (string) ($check['error'] ?? 'blocked'), 0);
            return 0;
        }

        if (empty($payload['eventId'])) {
            $payload['eventId'] = 'evt_' . bin2hex(random_bytes(12));
        }
        $payload['event'] = $event;
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $secret = self::secret($brand);
        $sig = self::sign($json, $secret);
        $maxAttempts = GpConfig::webhookMaxRetries();
        $now = GpIds::now();
        $brandId = (string) ($brand['brand_id'] ?? '');
        $merchantId = (string) ($brand['merchant_id'] ?? '');
        if ($merchantId === '' && $brandId !== '') {
            $row = GpDb::one('SELECT merchant_id FROM gp_brands WHERE brand_id = ?', [$brandId]);
            $merchantId = (string) ($row['merchant_id'] ?? '');
        }

        $deliveryId = self::insertDeliveryRow(
            $brandId,
            $payload,
            $target,
            $sig,
            0,
            'pending',
            $event,
            'queued',
            0,
            $now
        );

        try {
            GpDb::exec(
                'INSERT INTO gp_webhook_queue
                 (webhook_delivery_id, brand_id, merchant_id, payload, endpoint_url, signing_secret, event_name,
                  attempt_count, max_attempts, next_attempt_at, status, last_error, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?)',
                [
                    $deliveryId,
                    $brandId,
                    $merchantId,
                    $json,
                    $target,
                    $secret,
                    $event,
                    $maxAttempts,
                    $now,
                    'pending',
                    $now,
                    $now,
                ]
            );
        } catch (Throwable $e) {
            error_log('GressPay webhook enqueue failed: ' . $e->getMessage());
            self::updateDeliveryRow($deliveryId, 0, 'failed', 'enqueue_failed', 0, $now);
            return 0;
        }

        return 202;
    }

    /**
     * Process one claimed queue row (worker). Updates delivery log + queue backoff.
     * @param array<string,mixed> $queueRow
     */
    public static function processQueueRow(array $queueRow): void
    {
        $queueId = (int) ($queueRow['id'] ?? 0);
        $deliveryId = (int) ($queueRow['webhook_delivery_id'] ?? 0);
        $target = (string) ($queueRow['endpoint_url'] ?? '');
        $json = (string) ($queueRow['payload'] ?? '{}');
        $secret = (string) ($queueRow['signing_secret'] ?? '');
        $event = (string) ($queueRow['event_name'] ?? 'payment.completed');
        $attemptCount = (int) ($queueRow['attempt_count'] ?? 0) + 1;
        $maxAttempts = (int) ($queueRow['max_attempts'] ?? GpConfig::webhookMaxRetries());
        $brandId = (string) ($queueRow['brand_id'] ?? '');
        $timeout = GpConfig::webhookTimeoutSeconds();
        $now = GpIds::now();

        $payload = json_decode($json, true);
        if (!is_array($payload)) {
            $payload = [];
        }

        $check = self::validateDestination($target);
        if (!$check['ok']) {
            $err = (string) ($check['error'] ?? 'blocked');
            self::updateDeliveryRow($deliveryId, 0, 'blocked', $err, $attemptCount, $now);
            self::finishQueue($queueId, 'failed', $err, $attemptCount, $now);
            return;
        }

        $sig = self::sign($json, $secret);
        $code = self::postJson($target, $json, $sig, $event, $payload, $timeout);

        if ($code >= 200 && $code < 300) {
            self::updateDeliveryRow($deliveryId, $code, 'delivered', $attemptCount > 1 ? 'succeeded_after_retry' : '', $attemptCount, $now);
            // Mirror legacy completed status for older readers.
            self::appendLegacyLog($brandId, $payload, $target, $sig, $code, 'completed', $now);
            self::finishQueue($queueId, 'delivered', null, $attemptCount, $now);
            return;
        }

        $note = 'attempt_failed_http_' . $code;
        self::updateDeliveryRow($deliveryId, $code, 'pending', $note, $attemptCount, $now);
        self::appendLegacyLog($brandId, $payload, $target, $sig, $code, 'pending', $now);

        if ($attemptCount >= $maxAttempts) {
            self::updateDeliveryRow($deliveryId, $code, 'failed', $note, $attemptCount, $now);
            self::finishQueue($queueId, 'failed', $note, $attemptCount, $now);
            return;
        }

        $delay = self::backoffSeconds($attemptCount);
        $nextAt = gmdate('Y-m-d\TH:i:s\Z', time() + $delay);
        GpDb::exec(
            'UPDATE gp_webhook_queue SET attempt_count = ?, status = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ?',
            [$attemptCount, 'pending', $nextAt, $note, $now, $queueId]
        );
    }

    /**
     * Claim due pending rows for processing.
     * @return list<array<string,mixed>>
     */
    public static function claimDueQueue(int $limit = 10): array
    {
        $now = GpIds::now();
        $limit = max(1, min(50, $limit));
        $rows = GpDb::all(
            "SELECT * FROM gp_webhook_queue
             WHERE status = 'pending' AND next_attempt_at <= ?
             ORDER BY id ASC
             LIMIT {$limit}",
            [$now]
        );
        $claimed = [];
        foreach ($rows as $row) {
            $id = (int) ($row['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }
            // Optimistic claim
            GpDb::exec(
                "UPDATE gp_webhook_queue SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'",
                [$now, $id]
            );
            $check = GpDb::one("SELECT * FROM gp_webhook_queue WHERE id = ? AND status = 'processing'", [$id]);
            if ($check !== null) {
                $claimed[] = $check;
            }
        }
        return $claimed;
    }

    public static function postJson(
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
    private static function insertDeliveryRow(
        string $brandId,
        array $payload,
        string $target,
        string $sig,
        int $code,
        string $status,
        string $event,
        string $note,
        int $attempt,
        string $now
    ): int {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $eventId = (string) ($payload['eventId'] ?? '');
        $sessionId = $payload['transactionId'] ?? ($payload['sessionId'] ?? null);
        if ($eventId === '') {
            $eventId = 'evt_' . bin2hex(random_bytes(8));
        }
        try {
            GpDb::exec(
                'INSERT INTO gp_webhook_deliveries
                 (event_id, brand_id, session_id, event_name, url, payload, signature, http_code, status, note, attempt, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $eventId,
                    $brandId,
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
            $id = (int) GpDb::pdo()->lastInsertId();
            if ($id > 0) {
                return $id;
            }
        } catch (Throwable $e) {
            error_log('GressPay delivery insert: ' . $e->getMessage());
        }
        return 0;
    }

    private static function updateDeliveryRow(
        int $deliveryId,
        int $code,
        string $status,
        string $note,
        int $attempt,
        string $now
    ): void {
        if ($deliveryId <= 0) {
            return;
        }
        try {
            GpDb::exec(
                'UPDATE gp_webhook_deliveries SET http_code = ?, status = ?, note = ?, attempt = ?, updated_at = ? WHERE id = ?',
                [$code, $status, $note, $attempt, $now, $deliveryId]
            );
        } catch (Throwable $e) {
            error_log('GressPay delivery update: ' . $e->getMessage());
        }
    }

    private static function finishQueue(int $queueId, string $status, ?string $error, int $attemptCount, string $now): void
    {
        if ($queueId <= 0) {
            return;
        }
        GpDb::exec(
            'UPDATE gp_webhook_queue SET status = ?, attempt_count = ?, last_error = ?, updated_at = ? WHERE id = ?',
            [$status, $attemptCount, $error, $now, $queueId]
        );
    }

    /** @param array<string,mixed> $payload */
    private static function appendLegacyLog(
        string $brandId,
        array $payload,
        string $target,
        string $sig,
        int $code,
        string $status,
        string $now
    ): void {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
        $sessionId = $payload['transactionId'] ?? ($payload['sessionId'] ?? null);
        try {
            GpDb::exec(
                'INSERT INTO gp_webhook_log (brand_id, session_id, url, payload, signature, http_code, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$brandId, $sessionId, $target, $json, $sig, $code, $status, $now, $now]
            );
        } catch (Throwable $e) {
            // ignore legacy log failures
        }
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
    ): void {
        $now = GpIds::now();
        self::insertDeliveryRow(
            (string) ($brand['brand_id'] ?? ''),
            $payload,
            $target,
            $sig,
            $code,
            $status,
            $event,
            $note,
            $attempt,
            $now
        );
        self::appendLegacyLog((string) ($brand['brand_id'] ?? ''), $payload, $target, $sig, $code, $status, $now);
    }
}
