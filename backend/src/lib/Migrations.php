<?php
declare(strict_types=1);

final class GpMigrations
{
    public static function run(): void
    {
        $pdo = GpDb::pdo();
        $driver = GpDb::driver();
        if ($driver === 'mysql') {
            $lock = GpDb::one("SELECT GET_LOCK('gresspay_schema', 60) AS acquired");
            if ((int) ($lock['acquired'] ?? 0) !== 1) {
                throw new RuntimeException('Schema migration lock unavailable.');
            }
        } elseif ($driver === 'pgsql') {
            $pdo->exec('SELECT pg_advisory_lock(74823001)');
        }
        try {
            $pdo->exec('CREATE TABLE IF NOT EXISTS gp_schema_version (version INTEGER PRIMARY KEY, applied_at VARCHAR(32) NOT NULL)');
            $migrations = [
                1 => static function (): void { GpDb::installLegacySchema(); },
                2 => [self::class, 'securityColumns'],
                3 => [self::class, 'qrAssets'],
                4 => [self::class, 'transactionClaims'],
            ];
            foreach ($migrations as $version => $apply) {
                if (GpDb::one('SELECT version FROM gp_schema_version WHERE version = ?', [$version]) !== null) {
                    continue;
                }
                // MySQL DDL commits implicitly. Each operation must be idempotent on retry.
                $apply();
                GpDb::exec('INSERT INTO gp_schema_version (version, applied_at) VALUES (?, ?)', [$version, GpIds::now()]);
            }
        } finally {
            if ($driver === 'mysql') {
                $pdo->exec("SELECT RELEASE_LOCK('gresspay_schema')");
            } elseif ($driver === 'pgsql') {
                $pdo->exec('SELECT pg_advisory_unlock(74823001)');
            }
        }
    }

    public static function addColumn(string $table, string $column, string $definition): bool
    {
        // Identifiers below are static migration definitions, never request values.
        $driver = GpDb::driver();
        if ($driver === 'sqlite') {
            $columns = GpDb::all('PRAGMA table_info(' . $table . ')');
            foreach ($columns as $existing) {
                if ($existing['name'] === $column) return false;
            }
        } else {
            $schema = $driver === 'mysql' ? 'DATABASE()' : 'current_schema()';
            if (GpDb::one('SELECT column_name FROM information_schema.columns WHERE table_schema = ' . $schema . ' AND table_name = ? AND column_name = ?', [$table, $column])) return false;
        }
        GpDb::pdo()->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
        return true;
    }

    private static function securityColumns(): void
    {
        foreach ([
            ['gp_merchants', 'email_verified', 'INTEGER NOT NULL DEFAULT 0'],
            ['gp_merchants', 'verified_at', 'VARCHAR(32)'],
            ['gp_merchants', 'token_version', 'INTEGER NOT NULL DEFAULT 0'],
            ['gp_devices', 'token_prefix', 'VARCHAR(12)'],
            ['gp_brands', 'require_payer_match', 'INTEGER NOT NULL DEFAULT 1'],
        ] as [$table, $column, $definition]) {
            $added = self::addColumn($table, $column, $definition);
            if ($added && $table === 'gp_brands' && $column === 'require_payer_match') {
                // Preserve old SDK/buyer behavior; new INSERTs get DEFAULT 1.
                GpDb::pdo()->exec('UPDATE gp_brands SET require_payer_match = 0');
            }
        }
        GpDb::exec("UPDATE gp_merchants SET email_verified = 1, verified_at = COALESCE(verified_at, ?) WHERE google_email_verified = 1 OR role = 'admin'", [GpIds::now()]);
        GpDb::pdo()->exec('CREATE TABLE IF NOT EXISTS gp_email_verifications (token_hash VARCHAR(64) PRIMARY KEY, merchant_id VARCHAR(24) NOT NULL, expires_at INTEGER NOT NULL, used_at VARCHAR(32))');
        foreach (GpDb::all("SELECT id, token_sealed FROM gp_devices WHERE token_prefix IS NULL AND token_sealed IS NOT NULL") as $row) {
            $token = GpCrypto::open((string) $row['token_sealed']);
            if ($token !== null && str_starts_with($token, 'gpdev_')) {
                GpDb::exec('UPDATE gp_devices SET token_prefix = ? WHERE id = ? AND token_prefix IS NULL', [substr($token, 0, 12), $row['id']]);
            }
        }
        self::index('idx_gp_device_prefix', 'gp_devices', 'token_prefix, status');
        self::index('idx_gp_rate_expiry', 'gp_rate_limit', 'window_start');
        GpDb::pdo()->exec('CREATE TABLE IF NOT EXISTS gp_login_failures (account_hash VARCHAR(64) PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL, next_attempt INTEGER NOT NULL)');
        self::index('idx_gp_login_expiry','gp_login_failures','window_start');
        self::index('idx_gp_email_expiry','gp_email_verifications','expires_at');
    }

    private static function qrAssets(): void
    {
        GpQrStorage::migrateLegacy();
        if (GpDb::driver() === 'mysql') {
            // Bounded prefix also supports legacy TEXT columns without indexing data URLs.
            self::index('idx_gp_qr_asset', 'gp_gateways', 'qr_status, qr_object_key(128)');
        } else {
            GpDb::pdo()->exec("CREATE INDEX IF NOT EXISTS idx_gp_qr_asset ON gp_gateways (qr_object_key) WHERE qr_status = 'ready'");
        }
    }

    private static function transactionClaims(): void
    {
        // Do not delete colliding legacy evidence. A conflicting backfill aborts deployment
        // for owner review rather than silently legitimizing duplicate payments.
        GpDb::pdo()->exec('UPDATE gp_transactions SET trx_id = UPPER(TRIM(trx_id)) WHERE trx_id IS NOT NULL');
        GpDb::pdo()->exec('UPDATE gp_sms_data SET trx_id = UPPER(TRIM(trx_id)) WHERE trx_id IS NOT NULL');
        self::index('idx_gp_txn_brand_trx', 'gp_transactions', 'brand_id, trx_id');
        self::index('idx_gp_sms_brand_trx', 'gp_sms_data', 'brand_id, trx_id, status');
        GpDb::pdo()->exec('CREATE TABLE IF NOT EXISTS gp_trx_claims (brand_id VARCHAR(24) NOT NULL, ledger_mode VARCHAR(8) NOT NULL, trx_id VARCHAR(160) NOT NULL, session_id VARCHAR(32) NOT NULL, PRIMARY KEY (brand_id,ledger_mode,trx_id))');
        foreach (GpDb::all("SELECT brand_id,ledger_mode,trx_id,session_id FROM gp_transactions WHERE status = 'completed' AND trx_id IS NOT NULL AND trx_id <> ''") as $row) {
            if (!GpTrxClaims::claim($row['brand_id'],$row['ledger_mode'],$row['trx_id'],$row['session_id'])) throw new RuntimeException('Conflicting legacy completed transaction IDs require owner review.');
        }
    }

    public static function index(string $name, string $table, string $columns): void
    {
        if (GpDb::driver() === 'mysql') {
            if (GpDb::one('SELECT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?', [$table, $name])) return;
            GpDb::pdo()->exec('CREATE INDEX ' . $name . ' ON ' . $table . ' (' . $columns . ')');
        } else {
            GpDb::pdo()->exec('CREATE INDEX IF NOT EXISTS ' . $name . ' ON ' . $table . ' (' . $columns . ')');
        }
    }
}
