<?php
declare(strict_types=1);

final class GpRateLimiter
{
    /**
     * Atomically increment a bucket. Returns true if still under max for the window.
     */
    public static function hit(string $bucket, int $max, int $window = 60): bool
    {
        $now = time();
        $driver = GpDb::driver();
        $pdo = GpDb::pdo();

        if (random_int(1, 100) === 1) {
            self::cleanupExpired($window);
        }

        try {
            if ($driver === 'mysql') {
                // Insert or bump; reset window when expired via conditional update then insert path.
                $pdo->beginTransaction();
                $row = GpDb::one('SELECT bucket, window_start, hit_count FROM gp_rate_limit WHERE bucket = ? FOR UPDATE', [$bucket]);
                if ($row === null) {
                    GpDb::exec(
                        'INSERT INTO gp_rate_limit (bucket, window_start, hit_count) VALUES (?, ?, 1)',
                        [$bucket, $now]
                    );
                    $pdo->commit();
                    return true;
                }
                $start = (int) $row['window_start'];
                if ($now - $start >= $window) {
                    GpDb::exec(
                        'UPDATE gp_rate_limit SET window_start = ?, hit_count = 1 WHERE bucket = ?',
                        [$now, $bucket]
                    );
                    $pdo->commit();
                    return true;
                }
                GpDb::exec(
                    'UPDATE gp_rate_limit SET hit_count = hit_count + 1 WHERE bucket = ?',
                    [$bucket]
                );
                $count = (int) $row['hit_count'] + 1;
                $pdo->commit();
                return $count <= $max;
            }

            // SQLite / PG: transaction + row lock where supported.
            $pdo->beginTransaction();
            if ($driver === 'pgsql') {
                $row = GpDb::one('SELECT bucket, window_start, hit_count FROM gp_rate_limit WHERE bucket = ? FOR UPDATE', [$bucket]);
            } else {
                // SQLite: BEGIN IMMEDIATE via transaction; SELECT then UPDATE.
                $row = GpDb::one('SELECT bucket, window_start, hit_count FROM gp_rate_limit WHERE bucket = ?', [$bucket]);
            }
            if ($row === null) {
                try {
                    GpDb::exec(
                        'INSERT INTO gp_rate_limit (bucket, window_start, hit_count) VALUES (?, ?, 1)',
                        [$bucket, $now]
                    );
                } catch (Throwable $e) {
                    // Concurrent insert — re-read.
                    $row = GpDb::one('SELECT bucket, window_start, hit_count FROM gp_rate_limit WHERE bucket = ?', [$bucket]);
                    if ($row === null) {
                        throw $e;
                    }
                }
                if ($row === null) {
                    $pdo->commit();
                    return true;
                }
            }
            $start = (int) $row['window_start'];
            $count = (int) $row['hit_count'];
            if ($now - $start >= $window) {
                GpDb::exec(
                    'UPDATE gp_rate_limit SET window_start = ?, hit_count = 1 WHERE bucket = ?',
                    [$now, $bucket]
                );
                $pdo->commit();
                return true;
            }
            $count++;
            GpDb::exec('UPDATE gp_rate_limit SET hit_count = ? WHERE bucket = ?', [$count, $bucket]);
            $pdo->commit();
            return $count <= $max;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('GpRateLimiter::hit failed: ' . $e->getMessage());
            // Fail closed on limiter errors to avoid open relay under DB issues.
            return false;
        }
    }

    public static function cleanupExpired(int $minWindow = 60): void
    {
        $cutoff = time() - max(300, $minWindow * 2);
        try {
            GpDb::exec('DELETE FROM gp_rate_limit WHERE window_start < ?', [$cutoff]);
        } catch (Throwable $e) {
            error_log('GpRateLimiter cleanup failed: ' . $e->getMessage());
        }
    }

    public static function ip(): string
    {
        return GpClientIp::resolve();
    }

    public static function emailBucket(string $email): string
    {
        return 'login:email:' . hash('sha256', strtolower(trim($email)));
    }

    public static function guard(string $bucket, int $max, int $window = 60): void
    {
        if (!self::hit($bucket, $max, $window)) {
            GpJson::error('RATE_LIMITED', 'Too many requests. Try again shortly.', 429);
        }
    }

    /** True when the bucket is already at/over max for the current window (read-only). */
    public static function isLimited(string $bucket, int $max, int $window = 60): bool
    {
        $row = GpDb::one('SELECT window_start, hit_count FROM gp_rate_limit WHERE bucket = ?', [$bucket]);
        if ($row === null) {
            return false;
        }
        $start = (int) $row['window_start'];
        if (time() - $start >= $window) {
            return false;
        }
        return (int) $row['hit_count'] >= $max;
    }

    public static function guardIfLimited(string $bucket, int $max, int $window = 60): void
    {
        if (self::isLimited($bucket, $max, $window)) {
            GpJson::error('RATE_LIMITED', 'Too many requests. Try again shortly.', 429);
        }
    }

    /** Record a failed login attempt for an email (generic errors at call site). */
    public static function recordLoginFailure(string $email): void
    {
        $email = strtolower(trim($email));
        if ($email === '') {
            return;
        }
        self::hit(self::emailBucket($email), 5, 900);
    }
}
