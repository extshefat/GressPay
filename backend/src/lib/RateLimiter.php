<?php
declare(strict_types=1);

final class GpRateLimiter
{
    public static function hit(string $bucket, int $max, int $window = 60): bool
    {
        $now = time();
        $row = GpDb::one('SELECT * FROM gp_rate_limit WHERE bucket = ?', [$bucket]);
        if ($row === null) {
            GpDb::exec(
                'INSERT INTO gp_rate_limit (bucket, window_start, hit_count) VALUES (?, ?, 1)',
                [$bucket, $now]
            );
            return true;
        }
        $start = (int) $row['window_start'];
        $count = (int) $row['hit_count'];
        if ($now - $start >= $window) {
            GpDb::exec(
                'UPDATE gp_rate_limit SET window_start = ?, hit_count = 1 WHERE bucket = ?',
                [$now, $bucket]
            );
            return true;
        }
        $count++;
        GpDb::exec('UPDATE gp_rate_limit SET hit_count = ? WHERE bucket = ?', [$count, $bucket]);
        return $count <= $max;
    }

    public static function ip(): string
    {
        $raw = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return trim(explode(',', (string) $raw)[0]);
    }

    public static function guard(string $bucket, int $max, int $window = 60): void
    {
        if (!self::hit($bucket, $max, $window)) {
            GpJson::error('RATE_LIMITED', 'Too many requests. Try again shortly.', 429);
        }
    }
}
