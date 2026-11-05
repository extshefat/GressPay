<?php
declare(strict_types=1);

final class GpRateLimiter
{
    /** Atomic increment; a concurrent read can reject early, never admit extra requests. */
    public static function hit(string $bucket, int $max, int $window = 60): bool
    {
        $window = max(1, min(86400, $window));
        $now = time();
        $start = intdiv($now, $window) * $window;
        $key = hash('sha256', $bucket . '|' . $window);
        $sql = GpDb::driver() === 'mysql'
            ? 'INSERT INTO gp_rate_limit (bucket, window_start, hit_count) VALUES (?, ?, 1)
               ON DUPLICATE KEY UPDATE hit_count = IF(window_start = VALUES(window_start), hit_count + 1, 1), window_start = VALUES(window_start)'
            : 'INSERT INTO gp_rate_limit (bucket, window_start, hit_count) VALUES (?, ?, 1)
               ON CONFLICT (bucket) DO UPDATE SET hit_count = CASE WHEN gp_rate_limit.window_start = excluded.window_start THEN gp_rate_limit.hit_count + 1 ELSE 1 END, window_start = excluded.window_start';
        GpDb::exec($sql, [$key, $start]);
        $row = GpDb::one('SELECT hit_count FROM gp_rate_limit WHERE bucket = ?', [$key]);
        if (random_int(1, 100) === 1) {
            self::cleanup();
        }
        return $row !== null && (int) $row['hit_count'] <= $max;
    }

    public static function cleanup(): void
    {
        GpDb::exec('DELETE FROM gp_login_failures WHERE window_start < ?', [time() - 900]);
        // All supported windows are <=24h. Keep two days to avoid deleting active counters.
        GpDb::exec('DELETE FROM gp_rate_limit WHERE window_start < ?', [time() - 172800]);
    }

    public static function inCidr(string $ip, string $cidr): bool
    {
        $parts = explode('/', trim($cidr), 2);
        $address = @inet_pton($ip);
        $network = @inet_pton($parts[0]);
        if ($address === false || $network === false || strlen($address) !== strlen($network)) {
            return false;
        }
        $bits = isset($parts[1]) && ctype_digit($parts[1]) ? (int) $parts[1] : (isset($parts[1]) ? -1 : strlen($address) * 8);
        if ($bits < 0 || $bits > strlen($address) * 8) {
            return false;
        }
        $bytes = intdiv($bits, 8);
        $rest = $bits % 8;
        return substr($address, 0, $bytes) === substr($network, 0, $bytes)
            && ($rest === 0 || ((ord($address[$bytes]) ^ ord($network[$bytes])) & (255 << (8 - $rest))) === 0);
    }

    public static function trusted(string $ip, string $setting): bool
    {
        foreach (preg_split('/[\s,]+/', GpConfig::get($setting, ''), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $cidr) {
            if (self::inCidr($ip, $cidr)) {
                return true;
            }
        }
        return false;
    }

    public static function ip(): string
    {
        $peer = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        if (!filter_var($peer, FILTER_VALIDATE_IP)) {
            return '0.0.0.0';
        }
        // This header is accepted only from the separately allowlisted Next container.
        if (self::trusted($peer, 'TRUSTED_NEXT_PROXIES')) {
            $client = trim((string) ($_SERVER['HTTP_X_GRESSPAY_CLIENT_IP'] ?? ''));
            return filter_var($client, FILTER_VALIDATE_IP) ? $client : $peer;
        }
        if (!self::trusted($peer, 'TRUSTED_PROXIES')) {
            return $peer;
        }
        $hops = (int) GpConfig::get('TRUSTED_PROXY_HOPS', '0');
        $chain = array_map('trim', explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')));
        if ($hops < 1 || count($chain) < $hops) {
            return $peer;
        }
        // Validate every proxy to the right as well as the immediate TCP peer.
        $chain[] = $peer;
        for ($i = count($chain) - 1; $i > count($chain) - 1 - $hops; $i--) {
            if (!self::trusted($chain[$i], 'TRUSTED_PROXIES')) {
                return $peer;
            }
        }
        $client = $chain[count($chain) - 1 - $hops];
        return filter_var($client, FILTER_VALIDATE_IP) ? $client : $peer;
    }

    public static function accountAllowed(string $email): bool
    {
        $row = GpDb::one('SELECT * FROM gp_login_failures WHERE account_hash = ?', [self::accountHash($email)]);
        return $row === null || (int) $row['window_start'] + 900 <= time()
            || ((int) $row['failures'] < 5 && (int) $row['next_attempt'] <= time());
    }

    public static function emailBucket(string $email): string { return self::accountHash($email); }

    public static function accountHash(string $email): string
    {
        return hash('sha256', strtolower(trim($email)));
    }

    public static function loginFailed(string $email): void
    {
        $now = time();
        $hash = self::accountHash($email);
        if (GpDb::driver() === 'mysql') {
            GpDb::exec('INSERT INTO gp_login_failures (account_hash, failures, window_start, next_attempt) VALUES (?, 1, ?, ?)
                ON DUPLICATE KEY UPDATE next_attempt = VALUES(window_start) + CASE WHEN window_start + 900 <= VALUES(window_start) THEN 1 WHEN failures < 2 THEN 2 WHEN failures < 3 THEN 4 WHEN failures < 4 THEN 8 ELSE 30 END,
                failures = IF(window_start + 900 <= VALUES(window_start), 1, failures + 1),
                window_start = IF(window_start + 900 <= VALUES(window_start), VALUES(window_start), window_start)', [$hash, $now, $now + 1]);
        } else {
            GpDb::exec('INSERT INTO gp_login_failures (account_hash, failures, window_start, next_attempt) VALUES (?, 1, ?, ?)
                ON CONFLICT (account_hash) DO UPDATE SET
                next_attempt = excluded.window_start + CASE WHEN gp_login_failures.window_start + 900 <= excluded.window_start THEN 1 WHEN gp_login_failures.failures < 2 THEN 2 WHEN gp_login_failures.failures < 3 THEN 4 WHEN gp_login_failures.failures < 4 THEN 8 ELSE 30 END,
                failures = CASE WHEN gp_login_failures.window_start + 900 <= excluded.window_start THEN 1 ELSE gp_login_failures.failures + 1 END,
                window_start = CASE WHEN gp_login_failures.window_start + 900 <= excluded.window_start THEN excluded.window_start ELSE gp_login_failures.window_start END', [$hash, $now, $now + 1]);
        }
    }

    public static function loginSucceeded(string $email): void
    {
        GpDb::exec('DELETE FROM gp_login_failures WHERE account_hash = ?', [self::accountHash($email)]);
        GpDb::exec('DELETE FROM gp_rate_limit WHERE bucket = ?', [hash('sha256', 'login-reservation:' . self::accountHash($email) . '|900')]);
    }

    public static function guard(string $bucket, int $max, int $window = 60): void
    {
        if (!self::hit($bucket, $max, $window)) {
            GpJson::error('RATE_LIMITED', 'Too many requests. Try again shortly.', 429);
        }
    }
}
