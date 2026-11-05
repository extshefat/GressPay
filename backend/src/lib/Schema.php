<?php
declare(strict_types=1);

/**
 * Versioned schema runner. Production requests must not call this on every boot —
 * use backend/bin/migrate.php (Docker entrypoint) instead.
 */
final class GpSchema
{
    public const CURRENT = 11;

    public static function migrateToLatest(bool $forceFullInstall = false): void
    {
        self::ensureVersionTable();
        $applied = self::currentVersion();

        // Existing DB without version stamp: detect core tables and stamp without re-running DDL.
        if ($applied === 0 && self::hasCoreTables() && !$forceFullInstall) {
            self::stamp(self::CURRENT);
            // Still apply additive ensureExtras for columns that may be missing.
            GpDb::ensureExtrasPublic();
            return;
        }

        if ($applied === 0) {
            GpDb::migrate();
            GpDb::ensureExtrasPublic();
            self::stamp(1);
            $applied = 1;
        }

        $lock = self::acquireLock();
        try {
            $applied = self::currentVersion();
            $dir = GRESSPAY_ROOT . '/schema/migrations';
            if (!is_dir($dir)) {
                GpDb::ensureExtrasPublic();
                if ($applied < self::CURRENT) {
                    self::stamp(self::CURRENT);
                }
                return;
            }
            $files = glob($dir . '/*.php') ?: [];
            sort($files, SORT_STRING);
            foreach ($files as $file) {
                $base = basename($file);
                if (!preg_match('/^(\d{3})_/', $base, $m)) {
                    continue;
                }
                $ver = (int) $m[1];
                if ($ver <= $applied) {
                    continue;
                }
                /** @var callable $fn */
                $fn = require $file;
                if (is_callable($fn)) {
                    $fn(GpDb::pdo(), GpDb::driver());
                }
                self::stamp($ver);
                $applied = $ver;
            }
            // Keep legacy ensureExtras for columns not yet migrated to numbered files.
            GpDb::ensureExtrasPublic();
            if ($applied < self::CURRENT) {
                self::stamp(self::CURRENT);
            }
        } finally {
            self::releaseLock($lock);
        }
    }

    public static function currentVersion(): int
    {
        try {
            $row = GpDb::one('SELECT version FROM gp_schema_version WHERE id = 1');
            return $row ? (int) $row['version'] : 0;
        } catch (Throwable $e) {
            return 0;
        }
    }

    public static function stamp(int $version): void
    {
        self::ensureVersionTable();
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $driver = GpDb::driver();
        if ($driver === 'mysql') {
            GpDb::exec(
                'INSERT INTO gp_schema_version (id, version, updated_at) VALUES (1, ?, ?)
                 ON DUPLICATE KEY UPDATE version = VALUES(version), updated_at = VALUES(updated_at)',
                [$version, $now]
            );
            return;
        }
        if ($driver === 'pgsql') {
            GpDb::exec(
                'INSERT INTO gp_schema_version (id, version, updated_at) VALUES (1, ?, ?)
                 ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_at = EXCLUDED.updated_at',
                [$version, $now]
            );
            return;
        }
        $existing = GpDb::one('SELECT id FROM gp_schema_version WHERE id = 1');
        if ($existing) {
            GpDb::exec('UPDATE gp_schema_version SET version = ?, updated_at = ? WHERE id = 1', [$version, $now]);
        } else {
            GpDb::exec('INSERT INTO gp_schema_version (id, version, updated_at) VALUES (1, ?, ?)', [$version, $now]);
        }
    }

    private static function ensureVersionTable(): void
    {
        $driver = GpDb::driver();
        if ($driver === 'mysql') {
            GpDb::pdo()->exec(
                "CREATE TABLE IF NOT EXISTS gp_schema_version (
                    id INT NOT NULL PRIMARY KEY,
                    version INT NOT NULL DEFAULT 0,
                    updated_at VARCHAR(32) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            );
            return;
        }
        GpDb::pdo()->exec(
            "CREATE TABLE IF NOT EXISTS gp_schema_version (
                id INTEGER PRIMARY KEY,
                version INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )"
        );
    }

    private static function hasCoreTables(): bool
    {
        try {
            GpDb::one('SELECT 1 AS ok FROM gp_merchants LIMIT 1');
            return true;
        } catch (Throwable $e) {
            return false;
        }
    }

    /** @return mixed lock handle */
    private static function acquireLock(): mixed
    {
        $driver = GpDb::driver();
        try {
            if ($driver === 'mysql') {
                $row = GpDb::one("SELECT GET_LOCK('gresspay_schema', 30) AS l");
                return $row;
            }
            if ($driver === 'pgsql') {
                GpDb::pdo()->exec('SELECT pg_advisory_lock(728401)');
                return true;
            }
        } catch (Throwable $e) {
            error_log('schema lock: ' . $e->getMessage());
        }
        return null;
    }

    private static function releaseLock(mixed $lock): void
    {
        $driver = GpDb::driver();
        try {
            if ($driver === 'mysql') {
                GpDb::one("SELECT RELEASE_LOCK('gresspay_schema')");
            } elseif ($driver === 'pgsql') {
                GpDb::pdo()->exec('SELECT pg_advisory_unlock(728401)');
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
}
