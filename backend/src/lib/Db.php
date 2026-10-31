<?php
declare(strict_types=1);

final class GpDb
{
    private static ?PDO $pdo = null;
    private static string $driver = 'sqlite';

    public static function boot(): void
    {
        self::pdo();
        self::migrate();
        self::ensureExtras();
    }

    public static function driver(): string
    {
        return self::$driver;
    }

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $driver = strtolower(GpConfig::get('DB_DRIVER', 'sqlite'));
        if (in_array($driver, ['pgsql', 'postgres', 'postgresql'], true)) {
            self::$driver = 'pgsql';
            $host = GpConfig::get('DB_HOST', '127.0.0.1');
            $port = GpConfig::get('DB_PORT', '5432');
            $name = GpConfig::get('DB_NAME', 'gresspay');
            $user = GpConfig::get('DB_USER', 'gresspay');
            $pass = GpConfig::get('DB_PASS', '');
            $sslmode = GpConfig::get('DB_SSLMODE', 'disable');
            $dsn = "pgsql:host={$host};port={$port};dbname={$name};sslmode={$sslmode};connect_timeout=5";
            self::$pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            return self::$pdo;
        }

        self::$driver = $driver === 'mysql' ? 'mysql' : 'sqlite';

        if (self::$driver === 'mysql') {
            $host = GpConfig::get('DB_HOST', '127.0.0.1');
            $port = GpConfig::get('DB_PORT', '3306');
            $name = GpConfig::get('DB_NAME', 'gresspay');
            $user = GpConfig::get('DB_USER', 'gresspay');
            $pass = GpConfig::get('DB_PASS', '');
            $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
            self::$pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_CONNECT_TIMEOUT => 5,
            ]);
            return self::$pdo;
        }

        $rel = GpConfig::get('SQLITE_PATH', 'storage/gresspay.sqlite');
        $path = str_starts_with($rel, '/') || preg_match('/^[A-Za-z]:\\\\/', $rel) ? $rel : GRESSPAY_ROOT . '/' . $rel;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        self::$pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        self::$pdo->exec('PRAGMA foreign_keys = ON');
        return self::$pdo;
    }

    public static function migrate(): void
    {
        $file = match (self::$driver) {
            'pgsql' => GRESSPAY_ROOT . '/schema/install.pgsql.sql',
            'mysql' => GRESSPAY_ROOT . '/schema/install.mysql.sql',
            default => GRESSPAY_ROOT . '/schema/install.sql',
        };
        $sql = file_get_contents($file);
        if ($sql === false) {
            return;
        }
        $cleaned = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
        $pdo = self::pdo();
        foreach (array_filter(array_map('trim', explode(';', $cleaned))) as $stmt) {
            if ($stmt === '') {
                continue;
            }
            $pdo->exec($stmt);
        }
    }

    private static function execDdl(string $sql): void
    {
        if (self::$driver === 'pgsql') {
            $sql = preg_replace('/id\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i', 'id SERIAL PRIMARY KEY', $sql) ?? $sql;
        }
        try {
            self::pdo()->exec($sql);
        } catch (PDOException $e) {
            // Table or index already exists
        }
    }

    private static function ensureExtras(): void
    {
        $alters = [
            'ALTER TABLE gp_payment_links ADD COLUMN description TEXT',
            'ALTER TABLE gp_payment_links ADD COLUMN webhook_url TEXT',
            // Phase 1: server-side test/live stamp for public checkout (buyers cannot choose).
            "ALTER TABLE gp_payment_links ADD COLUMN ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live'",
            'ALTER TABLE gp_payment_links ADD COLUMN success_redirect_url TEXT',
            'ALTER TABLE gp_payment_links ADD COLUMN product_image_url TEXT',
            'ALTER TABLE gp_payment_links ADD COLUMN custom_fields_json TEXT',
        ];
        foreach ($alters as $sql) {
            try {
                self::pdo()->exec($sql);
            } catch (PDOException $e) {
                // column already exists
            }
        }
        // Helpful indexes for TxID / SMS idempotency lookups (non-unique; uniqueness enforced in app + markPaid lock).
        $indexes = self::$driver === 'mysql'
            ? [
                'CREATE INDEX idx_gp_txn_brand_trx ON gp_transactions (brand_id, trx_id)',
                'CREATE INDEX idx_gp_txn_status ON gp_transactions (status)',
                'CREATE INDEX idx_gp_sms_brand_trx ON gp_sms_data (brand_id, trx_id, status)',
            ]
            : [
                'CREATE INDEX IF NOT EXISTS idx_gp_txn_brand_trx ON gp_transactions (brand_id, trx_id)',
                'CREATE INDEX IF NOT EXISTS idx_gp_txn_status ON gp_transactions (status)',
                'CREATE INDEX IF NOT EXISTS idx_gp_sms_brand_trx ON gp_sms_data (brand_id, trx_id, status)',
            ];
        foreach ($indexes as $sql) {
            try {
                self::pdo()->exec($sql);
            } catch (PDOException $e) {
                // index already exists (MySQL)
            }
        }
        $devices = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_devices (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(28) NOT NULL UNIQUE,
                brand_id VARCHAR(24) NOT NULL,
                label VARCHAR(80) NULL,
                token_hash TEXT NOT NULL,
                status VARCHAR(16) NOT NULL DEFAULT 'active',
                last_seen_at VARCHAR(32) NULL,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id VARCHAR(28) NOT NULL UNIQUE,
                brand_id VARCHAR(24) NOT NULL,
                label TEXT,
                token_hash TEXT NOT NULL,
                status VARCHAR(16) NOT NULL DEFAULT 'active',
                last_seen_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($devices);

        $deviceAlters = [
            'ALTER TABLE gp_devices ADD COLUMN label VARCHAR(80)',
            'ALTER TABLE gp_devices ADD COLUMN last_seen_at VARCHAR(32)',
            'ALTER TABLE gp_transactions ADD COLUMN evidence_type VARCHAR(32)',
            'ALTER TABLE gp_transactions ADD COLUMN evidence_ref VARCHAR(120)',
            'ALTER TABLE gp_transactions ADD COLUMN verified_amount DECIMAL(20,8)',
            'ALTER TABLE gp_transactions ADD COLUMN verified_currency VARCHAR(8)',
            'ALTER TABLE gp_transactions ADD COLUMN verified_at VARCHAR(32)',
            'ALTER TABLE gp_transactions ADD COLUMN merchant_trade_no VARCHAR(64)',
            'ALTER TABLE gp_transactions ADD COLUMN chain_tx_hash VARCHAR(80)',
            'ALTER TABLE gp_sms_data ADD COLUMN device_id VARCHAR(28)',
            'ALTER TABLE gp_sms_data ADD COLUMN idempotency_key VARCHAR(80)',
            'ALTER TABLE gp_brands ADD COLUMN binance_pay_json TEXT',
            'ALTER TABLE gp_brands ADD COLUMN crypto_enabled INTEGER NOT NULL DEFAULT 0',
                        'ALTER TABLE gp_merchants ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT \'merchant\'',
            'ALTER TABLE gp_merchants ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT \'active\'',
            'ALTER TABLE gp_merchants ADD COLUMN plan_id VARCHAR(32) NOT NULL DEFAULT \'starter\'',
            'ALTER TABLE gp_merchants ADD COLUMN plan_expires_at VARCHAR(32)',
            'ALTER TABLE gp_plans ADD COLUMN device_limit INT NOT NULL DEFAULT 1',
            'ALTER TABLE gp_plans ADD COLUMN method_limit INT NOT NULL DEFAULT 2',
            'ALTER TABLE gp_merchants ADD COLUMN google_id VARCHAR(64)',
            "ALTER TABLE gp_merchants ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'",
            'ALTER TABLE gp_merchants ADD COLUMN avatar_url TEXT',
            'ALTER TABLE gp_merchants ADD COLUMN google_email_verified INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE gp_merchants ADD COLUMN brand_name VARCHAR(120)',
            'ALTER TABLE gp_merchants ADD COLUMN brand_logo_url TEXT',
            'ALTER TABLE gp_merchants ADD COLUMN support_contact VARCHAR(160)',
            'ALTER TABLE gp_merchants ADD COLUMN telegram_bot_token TEXT',
            'ALTER TABLE gp_merchants ADD COLUMN telegram_chat_id VARCHAR(64)',
            'ALTER TABLE gp_merchants ADD COLUMN discord_webhook_url TEXT',
            'ALTER TABLE gp_merchants ADD COLUMN receipt_footer TEXT',
            'ALTER TABLE gp_merchants ADD COLUMN notify_prefs_json TEXT',
            'ALTER TABLE gp_api_keys ADD COLUMN key_sealed TEXT',
            'ALTER TABLE gp_devices ADD COLUMN token_sealed TEXT',
            'ALTER TABLE gp_gateways ADD COLUMN gateway_fee DECIMAL(20,8)',
            'ALTER TABLE gp_gateways ADD COLUMN gateway_fee_type VARCHAR(16) NOT NULL DEFAULT \'percentage\'',
            'ALTER TABLE gp_gateways ADD COLUMN exchange_rate DECIMAL(20,8)',
            'ALTER TABLE gp_gateways ADD COLUMN gateway_category VARCHAR(32)',
        ];
        foreach ($deviceAlters as $sql) {
            try {
                self::pdo()->exec($sql);
            } catch (PDOException $e) {
                // exists
            }
        }

        $rateLimit = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_rate_limit (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                bucket VARCHAR(80) NOT NULL UNIQUE,
                window_start INT NOT NULL,
                hit_count INT NOT NULL DEFAULT 0
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_rate_limit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bucket VARCHAR(80) NOT NULL UNIQUE,
                window_start INTEGER NOT NULL,
                hit_count INTEGER NOT NULL DEFAULT 0
              )";
        self::execDdl($rateLimit);

        $oauthStates = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_oauth_states (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                state VARCHAR(64) NOT NULL UNIQUE,
                nonce VARCHAR(64) NOT NULL,
                code_verifier VARCHAR(128) NULL,
                redirect_uri TEXT NULL,
                expires_at INT NOT NULL,
                created_at VARCHAR(32) NOT NULL,
                INDEX idx_gp_oauth_state (state),
                INDEX idx_gp_oauth_expires (expires_at)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_oauth_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                state VARCHAR(64) NOT NULL UNIQUE,
                nonce VARCHAR(64) NOT NULL,
                code_verifier TEXT,
                redirect_uri TEXT,
                expires_at INTEGER NOT NULL,
                created_at TEXT NOT NULL
              )";
        self::execDdl($oauthStates);

        $evidence = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_payment_evidence (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32) NOT NULL,
                evidence_type VARCHAR(32) NOT NULL,
                provider_ref VARCHAR(160),
                amount DECIMAL(20,8),
                currency VARCHAR(8),
                meta_json TEXT,
                verified_at VARCHAR(32) NOT NULL,
                created_at VARCHAR(32) NOT NULL,
                UNIQUE KEY uq_gp_evidence_session_type (session_id, evidence_type)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_payment_evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32) NOT NULL,
                evidence_type VARCHAR(32) NOT NULL,
                provider_ref TEXT,
                amount DECIMAL(20,8),
                currency VARCHAR(8),
                meta_json TEXT,
                verified_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(session_id, evidence_type)
              )";
        self::execDdl($evidence);

        $deliveries = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_webhook_deliveries (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(48) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32),
                event_name VARCHAR(64) NOT NULL,
                url TEXT NOT NULL,
                payload TEXT NOT NULL,
                signature TEXT,
                http_code INTEGER,
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                note TEXT,
                attempt INT NOT NULL DEFAULT 1,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                KEY idx_gp_wh_event (event_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_webhook_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id VARCHAR(48) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32),
                event_name VARCHAR(64) NOT NULL,
                url TEXT NOT NULL,
                payload TEXT NOT NULL,
                signature TEXT,
                http_code INTEGER,
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                note TEXT,
                attempt INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($deliveries);

        $providerOrders = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_provider_orders (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32) NOT NULL,
                provider VARCHAR(32) NOT NULL,
                merchant_trade_no VARCHAR(64) NOT NULL,
                provider_order_id VARCHAR(80),
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                amount DECIMAL(20,8) NOT NULL,
                currency VARCHAR(8) NOT NULL,
                raw_json TEXT,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                UNIQUE KEY uq_gp_provider_trade (brand_id, merchant_trade_no),
                UNIQUE KEY uq_gp_provider_session (session_id, provider)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_provider_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32) NOT NULL,
                provider VARCHAR(32) NOT NULL,
                merchant_trade_no VARCHAR(64) NOT NULL,
                provider_order_id TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                amount DECIMAL(20,8) NOT NULL,
                currency VARCHAR(8) NOT NULL,
                raw_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(brand_id, merchant_trade_no),
                UNIQUE(session_id, provider)
              )";
        self::execDdl($providerOrders);

        $nonces = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_binance_callback_nonces (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nonce VARCHAR(64) NOT NULL,
                merchant_trade_no VARCHAR(64),
                brand_id VARCHAR(24),
                created_at VARCHAR(32) NOT NULL,
                UNIQUE KEY uq_gp_binance_nonce (nonce)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_binance_callback_nonces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nonce VARCHAR(64) NOT NULL UNIQUE,
                merchant_trade_no TEXT,
                brand_id TEXT,
                created_at TEXT NOT NULL
              )";
        self::execDdl($nonces);

        $audit = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_audit_log (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                brand_id VARCHAR(24) NOT NULL,
                session_id VARCHAR(32),
                actor_id VARCHAR(32),
                action VARCHAR(64) NOT NULL,
                meta_json TEXT,
                created_at VARCHAR(32) NOT NULL,
                KEY idx_gp_audit_brand (brand_id),
                KEY idx_gp_audit_session (session_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id TEXT NOT NULL,
                session_id TEXT,
                actor_id TEXT,
                action TEXT NOT NULL,
                meta_json TEXT,
                created_at TEXT NOT NULL
              )";
        self::execDdl($audit);

        $gateways = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_gateways (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                gateway_id VARCHAR(32) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                method_code VARCHAR(40) NOT NULL,
                display_name VARCHAR(120) NOT NULL,
                account_type VARCHAR(40) NOT NULL DEFAULT 'personal',
                account VARCHAR(160) NULL,
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                country VARCHAR(8) NOT NULL DEFAULT 'BD',
                instructions TEXT NULL,
                min_amount DECIMAL(20,8) NULL,
                max_amount DECIMAL(20,8) NULL,
                display_order INT NOT NULL DEFAULT 0,
                status VARCHAR(16) NOT NULL DEFAULT 'inactive',
                qr_object_key VARCHAR(512) NULL,
                qr_mime VARCHAR(64) NULL,
                qr_bytes INT NULL,
                qr_checksum VARCHAR(64) NULL,
                qr_status VARCHAR(16) NOT NULL DEFAULT 'none',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                UNIQUE KEY uq_gp_gw_brand_id (brand_id, gateway_id),
                KEY idx_gp_gw_brand_method (brand_id, method_code, status),
                KEY idx_gp_gw_brand_order (brand_id, display_order)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_gateways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gateway_id VARCHAR(32) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                method_code VARCHAR(40) NOT NULL,
                display_name VARCHAR(120) NOT NULL,
                account_type VARCHAR(40) NOT NULL DEFAULT 'personal',
                account TEXT,
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                country VARCHAR(8) NOT NULL DEFAULT 'BD',
                instructions TEXT,
                min_amount DECIMAL(20,8),
                max_amount DECIMAL(20,8),
                display_order INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(16) NOT NULL DEFAULT 'inactive',
                qr_object_key TEXT,
                qr_mime VARCHAR(64),
                qr_bytes INTEGER,
                qr_checksum VARCHAR(64),
                qr_status VARCHAR(16) NOT NULL DEFAULT 'none',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(brand_id, gateway_id)
              )";
        self::execDdl($gateways);

        $planOrders = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_account_plan_orders (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(32) NOT NULL UNIQUE,
                merchant_id VARCHAR(24) NOT NULL,
                plan_id VARCHAR(32) NOT NULL,
                plan_code VARCHAR(40) NOT NULL,
                plan_name VARCHAR(80) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                session_id VARCHAR(32) NULL,
                trx_id VARCHAR(80) NULL,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                KEY idx_gp_apo_merchant (merchant_id),
                KEY idx_gp_apo_session (session_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_account_plan_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id VARCHAR(32) NOT NULL UNIQUE,
                merchant_id VARCHAR(24) NOT NULL,
                plan_id VARCHAR(32) NOT NULL,
                plan_code VARCHAR(40) NOT NULL,
                plan_name VARCHAR(80) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                status VARCHAR(16) NOT NULL DEFAULT 'pending',
                session_id VARCHAR(32),
                trx_id VARCHAR(80),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($planOrders);

        foreach ([
            'ALTER TABLE gp_transactions ADD COLUMN gateway_id VARCHAR(32)',
            'ALTER TABLE gp_transactions ADD COLUMN chain_tx_hash VARCHAR(80)',
            'ALTER TABLE gp_transactions ADD COLUMN merchant_trade_no VARCHAR(64)',
        ] as $alterTxn) {
            try {
                self::pdo()->exec($alterTxn);
            } catch (PDOException $e) {
                // already exists
            }
        }

        $plansTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_plans (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                plan_id VARCHAR(32) NOT NULL UNIQUE,
                name VARCHAR(80) NOT NULL,
                code VARCHAR(40) NOT NULL UNIQUE,
                description TEXT NULL,
                price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                credit_allowance INT NOT NULL DEFAULT 100,
                features_json TEXT NULL,
                is_free INT NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id VARCHAR(32) NOT NULL UNIQUE,
                name VARCHAR(80) NOT NULL,
                code VARCHAR(40) NOT NULL UNIQUE,
                description TEXT,
                price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                credit_allowance INTEGER NOT NULL DEFAULT 100,
                features_json TEXT,
                is_free INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($plansTable);

        $subsTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_subscriptions (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                subscription_id VARCHAR(32) NOT NULL UNIQUE,
                merchant_id VARCHAR(24) NOT NULL,
                plan_id VARCHAR(32) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                credits_remaining INT NOT NULL DEFAULT 0,
                credits_used INT NOT NULL DEFAULT 0,
                starts_at VARCHAR(32) NOT NULL,
                expires_at VARCHAR(32) NULL,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                INDEX idx_gp_sub_merchant (merchant_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id VARCHAR(32) NOT NULL UNIQUE,
                merchant_id VARCHAR(24) NOT NULL,
                plan_id VARCHAR(32) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                credits_remaining INTEGER NOT NULL DEFAULT 0,
                credits_used INTEGER NOT NULL DEFAULT 0,
                starts_at TEXT NOT NULL,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($subsTable);

        $creditsTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_credit_transactions (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                merchant_id VARCHAR(24) NOT NULL,
                delta INT NOT NULL,
                balance_after INT NOT NULL,
                reason VARCHAR(255) NOT NULL,
                created_by VARCHAR(120) NOT NULL,
                created_at VARCHAR(32) NOT NULL,
                INDEX idx_gp_credit_merchant (merchant_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_credit_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_id VARCHAR(24) NOT NULL,
                delta INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                reason VARCHAR(255) NOT NULL,
                created_by VARCHAR(120) NOT NULL,
                created_at TEXT NOT NULL
              )";
        self::execDdl($creditsTable);

        $supportTickets = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_support_tickets (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                ticket_id VARCHAR(32) NOT NULL,
                merchant_id VARCHAR(24) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                contact_email VARCHAR(190) NOT NULL,
                subject VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                UNIQUE KEY uq_gp_support_ticket (ticket_id),
                KEY idx_gp_support_merchant (merchant_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id VARCHAR(32) NOT NULL UNIQUE,
                merchant_id VARCHAR(24) NOT NULL,
                brand_id VARCHAR(24) NOT NULL,
                contact_email VARCHAR(190) NOT NULL,
                subject VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($supportTickets);

        $adminAuditTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_admin_audit_logs (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                actor_email VARCHAR(120) NOT NULL,
                target_type VARCHAR(40) NOT NULL,
                target_id VARCHAR(64) NOT NULL,
                action VARCHAR(64) NOT NULL,
                details_json TEXT NULL,
                ip_address VARCHAR(45) NULL,
                created_at VARCHAR(32) NOT NULL,
                INDEX idx_gp_admin_audit_actor (actor_email),
                INDEX idx_gp_admin_audit_target (target_type, target_id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_admin_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_email VARCHAR(120) NOT NULL,
                target_type VARCHAR(40) NOT NULL,
                target_id VARCHAR(64) NOT NULL,
                action VARCHAR(64) NOT NULL,
                details_json TEXT,
                ip_address VARCHAR(45),
                created_at TEXT NOT NULL
              )";
        self::execDdl($adminAuditTable);

        $platformGatewaysTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_platform_gateways (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                gateway_code VARCHAR(40) NOT NULL UNIQUE,
                slug VARCHAR(60) NOT NULL,
                display_name VARCHAR(120) NOT NULL,
                category VARCHAR(20) NOT NULL DEFAULT 'mfs',
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                is_enabled INT NOT NULL DEFAULT 1,
                display_order INT NOT NULL DEFAULT 0,
                instructions TEXT NULL,
                min_amount DECIMAL(20,8) NOT NULL DEFAULT 10,
                max_amount DECIMAL(20,8) NOT NULL DEFAULT 100000,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL,
                INDEX idx_gp_pg_cat (category),
                INDEX idx_gp_pg_enabled (is_enabled)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_platform_gateways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gateway_code VARCHAR(40) NOT NULL UNIQUE,
                slug VARCHAR(60) NOT NULL,
                display_name VARCHAR(120) NOT NULL,
                category VARCHAR(20) NOT NULL DEFAULT 'mfs',
                currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
                is_enabled INTEGER NOT NULL DEFAULT 1,
                display_order INTEGER NOT NULL DEFAULT 0,
                instructions TEXT,
                min_amount DECIMAL(20,8) NOT NULL DEFAULT 10,
                max_amount DECIMAL(20,8) NOT NULL DEFAULT 100000,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($platformGatewaysTable);

        $subscriptionPlansTable = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_subscription_plans (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                plan_id VARCHAR(32) NOT NULL UNIQUE,
                name VARCHAR(80) NOT NULL,
                code VARCHAR(40) NOT NULL UNIQUE,
                description TEXT NULL,
                price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                credit_allowance INT NOT NULL DEFAULT 100,
                device_limit INT NOT NULL DEFAULT 1,
                method_limit INT NOT NULL DEFAULT 2,
                features_json TEXT NULL,
                is_free INT NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_subscription_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id VARCHAR(32) NOT NULL UNIQUE,
                name VARCHAR(80) NOT NULL,
                code VARCHAR(40) NOT NULL UNIQUE,
                description TEXT,
                price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                credit_allowance INTEGER NOT NULL DEFAULT 100,
                device_limit INTEGER NOT NULL DEFAULT 1,
                method_limit INTEGER NOT NULL DEFAULT 2,
                features_json TEXT,
                is_free INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($subscriptionPlansTable);

        $adminOverrides = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_admin_overrides (
                email VARCHAR(190) NOT NULL PRIMARY KEY,
                allowed INT NOT NULL DEFAULT 0,
                updated_at VARCHAR(32) NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : (self::$driver === 'pgsql'
                ? "CREATE TABLE IF NOT EXISTS gp_admin_overrides (
                    email VARCHAR(190) PRIMARY KEY,
                    allowed INTEGER NOT NULL DEFAULT 0,
                    updated_at VARCHAR(32) NOT NULL
                  )"
                : "CREATE TABLE IF NOT EXISTS gp_admin_overrides (
                    email VARCHAR(190) NOT NULL PRIMARY KEY,
                    allowed INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                  )");
        self::execDdl($adminOverrides);

        $platformSettings = self::$driver === 'mysql'
            ? "CREATE TABLE IF NOT EXISTS gp_platform_settings (
                setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
                setting_value TEXT NULL,
                updated_at VARCHAR(32) NOT NULL
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            : "CREATE TABLE IF NOT EXISTS gp_platform_settings (
                setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
                setting_value TEXT,
                updated_at TEXT NOT NULL
              )";
        self::execDdl($platformSettings);

        self::seedDefaultPlatformGateways();
        self::seedMissingPlatformGateways();

        self::seedDefaultPlans();
        self::autoPromoteSuperAdmins();

        self::backfillGatewaysFromMethods();

        // Partial uniqueness for completed TxIDs (SQLite: unique index where status=completed)
        $uniq = self::$driver === 'mysql'
            ? [
                // MySQL 8+ functional unique is limited; enforce via app + unique on merchant_trade_no / chain hash when set
                'CREATE UNIQUE INDEX uq_gp_txn_trade ON gp_transactions (brand_id, merchant_trade_no)',
                'CREATE UNIQUE INDEX uq_gp_txn_chain ON gp_transactions (brand_id, chain_tx_hash)',
            ]
            : [
                'CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_txn_completed_trx ON gp_transactions (brand_id, ledger_mode, trx_id) WHERE status = \'completed\' AND trx_id IS NOT NULL AND trx_id != \'\'',
                'CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_txn_trade ON gp_transactions (brand_id, merchant_trade_no) WHERE merchant_trade_no IS NOT NULL AND merchant_trade_no != \'\'',
                'CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_txn_chain ON gp_transactions (brand_id, chain_tx_hash) WHERE chain_tx_hash IS NOT NULL AND chain_tx_hash != \'\'',
                'CREATE UNIQUE INDEX IF NOT EXISTS uq_gp_sms_brand_trx_approved ON gp_sms_data (brand_id, trx_id) WHERE status IN (\'approved\', \'used\')',
            ];
        foreach ($uniq as $sql) {
            try {
                self::pdo()->exec($sql);
            } catch (PDOException $e) {
                self::logSchemaFailure('unique_index', $sql, $e);
            }
        }
    }

    private static function logSchemaFailure(string $kind, string $sql, PDOException $e): void
    {
        $msg = '[GpDb] ' . $kind . ' failed: ' . $e->getMessage() . ' | ' . substr($sql, 0, 120);
        error_log($msg);
        if (strtolower(GpConfig::get('APP_ENV', 'development')) === 'production') {
            // Do not abort boot on optional unique indexes (MySQL rejects partial WHERE);
            // critical CREATE TABLE failures already throw from exec above.
            error_log('[GpDb] production schema note — app-level markPaid uniqueness remains authoritative for nullable trade/hash.');
        }
    }

    private static function seedDefaultPlatformGateways(): void
    {
        try {
            $count = (int) (self::one("SELECT COUNT(*) as c FROM gp_platform_gateways")['c'] ?? 0);
            if ($count > 0) {
                return;
            }
            $now = GpIds::now();
            $gateways = [
                ['bkash', 'bkash-personal', 'bKash Personal (Direct Wallet + SMS Match)', 'mfs', 'BDT', 1, 1, 10, 25000],
                ['nagad', 'nagad-personal', 'Nagad Personal (Direct Wallet + SMS Match)', 'mfs', 'BDT', 1, 2, 10, 25000],
                ['rocket', 'rocket-personal', 'Rocket Personal (Direct Wallet + SMS Match)', 'mfs', 'BDT', 1, 3, 10, 25000],
                ['upay', 'upay-personal', 'Upay Personal (Direct Wallet + SMS Match)', 'mfs', 'BDT', 1, 4, 10, 25000],
                ['cellfin', 'cellfin-personal', 'Cellfin IBBL (Smart Banking + SMS Match)', 'mfs', 'BDT', 1, 5, 10, 50000],
                ['usdt_trc20', 'usdt-trc20', 'USDT TRC-20 (TRON Blockchain)', 'crypto', 'USDT', 1, 6, 1, 100000],
                ['binance_pay', 'binance-personal', 'Binance Pay (Merchant API / QR)', 'crypto', 'USDT', 1, 7, 1, 100000],
                ['bybit_pay', 'bybit-pay', 'Bybit Pay (Internal Transfer / UID)', 'crypto', 'USDT', 1, 8, 1, 100000],
            ];
            $stmt = self::pdo()->prepare(
                "INSERT INTO gp_platform_gateways (gateway_code, slug, display_name, category, currency, is_enabled, display_order, min_amount, max_amount, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            foreach ($gateways as $g) {
                $stmt->execute([
                    $g[0], $g[1], $g[2], $g[3], $g[4], $g[5], $g[6], $g[7], $g[8], $now, $now
                ]);
            }
        } catch (Throwable $e) {
            error_log('[GpDb] seedDefaultPlatformGateways failed: ' . $e->getMessage());
        }
    }

    private static function seedMissingPlatformGateways(): void
    {
        try {
            $now = GpIds::now();
            $order = 20;
            foreach (GpCatalog::methods() as $cat) {
                if (empty($cat['releaseScope'])) {
                    continue;
                }
                $code = (string) $cat['code'];
                $exists = self::one(
                    'SELECT id FROM gp_platform_gateways WHERE gateway_code = ? OR slug = ? LIMIT 1',
                    [$code, $cat['slug'] ?? $code]
                );
                if ($exists !== null) {
                    continue;
                }
                self::exec(
                    'INSERT INTO gp_platform_gateways (gateway_code, slug, display_name, category, currency, is_enabled, display_order, min_amount, max_amount, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $code,
                        (string) ($cat['slug'] ?? $code),
                        (string) ($cat['title'] ?? $code),
                        (string) ($cat['category'] ?? 'mfs'),
                        (string) ($cat['currency'] ?? 'BDT'),
                        1,
                        $order++,
                        (float) ($cat['minAmount'] ?? 10),
                        (float) ($cat['maxAmount'] ?? 100000),
                        $now,
                        $now,
                    ]
                );
            }
        } catch (Throwable $e) {
            error_log('[GpDb] seedMissingPlatformGateways failed: ' . $e->getMessage());
        }
    }

    private static function autoPromoteSuperAdmins(): void
    {
        try {
            $admins = GpConfig::adminEmails();
            if (empty($admins)) {
                return;
            }
            $stmt = self::pdo()->prepare(
                "UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE LOWER(TRIM(email)) = ?"
            );
            foreach ($admins as $email) {
                $stmt->execute([$email]);
            }
        } catch (Throwable $e) {
            error_log('[GpDb] autoPromoteSuperAdmins note: ' . $e->getMessage());
        }
    }

    private static function seedDefaultPlans(): void
    {
        try {
            $now = GpIds::now();
            $plans = [
                [
                    'plan_id' => 'plan_trial',
                    'name' => 'Trial',
                    'code' => 'trial',
                    'price_bdt' => 0.00,
                    'credit_allowance' => 50,
                    'device_limit' => 1,
                    'method_limit' => 2,
                    'is_free' => 1,
                    'description' => 'Automatic on new registration — explore live checkouts with Bangladesh MFS.',
                    'features_json' => json_encode([
                        '1 Website on Your Account',
                        '50 Completed Checkouts / Calendar Month (Asia/Dhaka)',
                        '1 Android Companion Device',
                        'All Bangladesh MFS Rails',
                        'Standard REST API & Webhooks',
                        '0% Transaction Fee',
                    ], JSON_UNESCAPED_SLASHES),
                ],
                [
                    'plan_id' => 'plan_starter',
                    'name' => 'Starter',
                    'code' => 'starter',
                    'price_bdt' => 499.00,
                    'credit_allowance' => 999999,
                    'device_limit' => 1,
                    'method_limit' => 4,
                    'is_free' => 0,
                    'description' => 'One website, unlimited live checkouts, full MFS automation.',
                    'features_json' => json_encode([
                        '1 Website on Your Account',
                        'Unlimited Completed Checkouts',
                        '1 Android Companion Device',
                        'All Bangladesh MFS: bKash, Nagad, Rocket, Upay',
                        'Standard REST API & Webhooks',
                        '0% Transaction Fee',
                    ], JSON_UNESCAPED_SLASHES),
                ],
                [
                    'plan_id' => 'plan_premium',
                    'name' => 'Premium',
                    'code' => 'premium',
                    'price_bdt' => 999.00,
                    'credit_allowance' => 999999,
                    'device_limit' => 3,
                    'method_limit' => 8,
                    'is_free' => 0,
                    'description' => 'Two websites plus crypto suite, branding, and instant alerts.',
                    'features_json' => json_encode([
                        '2 Websites on Your Account',
                        'Unlimited Completed Checkouts',
                        'Up to 3 Android Companion Devices',
                        'All MFS + Full Crypto Suite (USDT TRC20, Binance Pay, Bybit Pay)',
                        'Custom Brand Logo & Name on Checkout',
                        'Instant Telegram & Discord Alerts',
                    ], JSON_UNESCAPED_SLASHES),
                ],
                [
                    'plan_id' => 'plan_pro',
                    'name' => 'Pro',
                    'code' => 'pro',
                    'price_bdt' => 1499.00,
                    'credit_allowance' => 999999,
                    'device_limit' => 5,
                    'method_limit' => 12,
                    'is_free' => 0,
                    'description' => 'Scale to five websites with priority webhook retries and higher device limits.',
                    'features_json' => json_encode([
                        '5 Websites on Your Account',
                        'Unlimited Completed Checkouts',
                        'Up to 5 Android Companion Devices',
                        'Full MFS + Crypto Suite',
                        'Custom Checkout Branding',
                        'Priority Webhook Retries',
                    ], JSON_UNESCAPED_SLASHES),
                ],
                [
                    'plan_id' => 'plan_enterprise',
                    'name' => 'Enterprise Scale',
                    'code' => 'enterprise',
                    'price_bdt' => 4999.00,
                    'credit_allowance' => 999999,
                    'device_limit' => 10,
                    'method_limit' => 20,
                    'is_free' => 0,
                    'description' => 'Legacy high-volume tier — contact support for assignment.',
                    'features_json' => json_encode([
                        'Up to 10 Connected Android Devices',
                        'Up to 20 Active Payment Gateways',
                        'Unlimited Automated Transactions',
                        'Multi-device Failover & Load Balancing',
                        'Dedicated Companion Worker Thread',
                        'Priority Telegram & Direct Channel Support',
                    ], JSON_UNESCAPED_SLASHES),
                ],
                [
                    'plan_id' => 'plan_lifetime',
                    'name' => 'Lifetime Unlimited',
                    'code' => 'lifetime',
                    'price_bdt' => 14999.00,
                    'credit_allowance' => 999999,
                    'device_limit' => 25,
                    'method_limit' => 50,
                    'is_free' => 0,
                    'description' => 'One-time investment for lifetime commercial access with maximum limits.',
                    'features_json' => json_encode([
                        'Up to 25 Connected Android Devices',
                        'Up to 50 Active Payment Gateways',
                        'Unlimited Automated Transactions',
                        'Full MFS + Crypto Gateway Suite',
                        'Lifetime Access with Zero Monthly Fees',
                    ], JSON_UNESCAPED_SLASHES),
                ],
            ];

            $insertPlan = self::pdo()->prepare(
                "INSERT INTO gp_plans (
                    plan_id, name, code, description, price_bdt, billing_cycle, credit_allowance, device_limit, method_limit, features_json, is_free, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'monthly', ?, ?, ?, ?, ?, 'active', ?, ?)"
            );

            $insertSubPlan = self::pdo()->prepare(
                "INSERT INTO gp_subscription_plans (
                    plan_id, name, code, description, price_bdt, billing_cycle, credit_allowance, device_limit, method_limit, features_json, is_free, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'monthly', ?, ?, ?, ?, ?, 'active', ?, ?)"
            );

            foreach ($plans as $p) {
                $exists = self::one("SELECT id FROM gp_plans WHERE code = ? OR plan_id = ?", [$p['code'], $p['plan_id']]);
                if (!$exists) {
                    $insertPlan->execute([
                        $p['plan_id'], $p['name'], $p['code'], $p['description'], $p['price_bdt'],
                        $p['credit_allowance'], $p['device_limit'], $p['method_limit'], $p['features_json'], $p['is_free'], $now, $now
                    ]);
                } else {
                    self::exec(
                        "UPDATE gp_plans SET name = ?, description = ?, price_bdt = ?, credit_allowance = ?, device_limit = ?, method_limit = ?, features_json = ?, is_free = ?, updated_at = ? WHERE id = ?",
                        [$p['name'], $p['description'], $p['price_bdt'], $p['credit_allowance'], $p['device_limit'], $p['method_limit'], $p['features_json'], $p['is_free'], $now, $exists['id']]
                    );
                }

                $subExists = self::one("SELECT id FROM gp_subscription_plans WHERE code = ? OR plan_id = ?", [$p['code'], $p['plan_id']]);
                if (!$subExists) {
                    $insertSubPlan->execute([
                        $p['plan_id'], $p['name'], $p['code'], $p['description'], $p['price_bdt'],
                        $p['credit_allowance'], $p['device_limit'], $p['method_limit'], $p['features_json'], $p['is_free'], $now, $now
                    ]);
                } else {
                    self::exec(
                        "UPDATE gp_subscription_plans SET name = ?, description = ?, price_bdt = ?, credit_allowance = ?, device_limit = ?, method_limit = ?, features_json = ?, is_free = ?, updated_at = ? WHERE id = ?",
                        [$p['name'], $p['description'], $p['price_bdt'], $p['credit_allowance'], $p['device_limit'], $p['method_limit'], $p['features_json'], $p['is_free'], $now, $subExists['id']]
                    );
                }
            }

            // Legacy free-tier accounts (starter without a paid expiry) → Trial.
            self::exec(
                "UPDATE gp_merchants SET plan_id = 'trial'
                 WHERE LOWER(plan_id) IN ('starter', 'plan_starter')
                   AND role != 'admin'
                   AND (plan_expires_at IS NULL OR TRIM(plan_expires_at) = '')"
            );
        } catch (Throwable $e) {
            error_log('[GpDb] seedDefaultPlans failed: ' . $e->getMessage());
        }
    }

    /** Idempotent: one gateway per brand+method when methods.options has a destination and no gateway yet. */
    private static function backfillGatewaysFromMethods(): void
    {
        try {
            $rows = self::all('SELECT * FROM gp_methods');
        } catch (Throwable $e) {
            return;
        }
        $now = date('c');
        foreach ($rows as $row) {
            $brandId = (string) ($row['brand_id'] ?? '');
            $code = (string) ($row['code'] ?? '');
            if ($brandId === '' || $code === '') {
                continue;
            }
            $existing = self::one(
                'SELECT gateway_id FROM gp_gateways WHERE brand_id = ? AND method_code = ? LIMIT 1',
                [$brandId, $code]
            );
            if ($existing !== null) {
                continue;
            }
            $opts = json_decode((string) ($row['options'] ?? '{}'), true);
            if (!is_array($opts)) {
                $opts = [];
            }
            $account = trim((string) ($opts['account'] ?? $opts['depositAddressOrNumber'] ?? $opts['mobile_number'] ?? ''));
            if ($account === '' && $code === 'binance_pay') {
                // Still create a placeholder inactive Binance gateway for UI continuity only when method active.
                if (($row['status'] ?? '') !== 'active') {
                    continue;
                }
            } elseif ($account === '') {
                continue;
            }
            $gwId = 'gw_' . bin2hex(random_bytes(8));
            $status = (($row['status'] ?? '') === 'active' && $account !== '') ? 'active' : 'inactive';
            $cat = class_exists('GpCatalog') ? GpCatalog::find($code) : null;
            $name = is_array($cat) ? ((string) ($cat['title'] ?? $code)) : $code;
            $currency = is_array($cat) ? ((string) ($cat['currency'] ?? 'BDT')) : 'BDT';
            $country = is_array($cat) ? ((string) ($cat['country'] ?? 'BD')) : 'BD';
            try {
                self::exec(
                    'INSERT INTO gp_gateways (
                        gateway_id, brand_id, method_code, display_name, account_type, account,
                        currency, country, instructions, min_amount, max_amount, display_order,
                        status, qr_status, created_at, updated_at
                     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        $gwId,
                        $brandId,
                        $code,
                        $name,
                        'personal',
                        $account !== '' ? $account : null,
                        $currency,
                        $country,
                        null,
                        null,
                        null,
                        0,
                        $status,
                        'none',
                        $now,
                        $now,
                    ]
                );
            } catch (Throwable $e) {
                error_log('[GpDb] gateway backfill skip: ' . $e->getMessage());
            }
        }
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return array<int,array<string,mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function exec(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Run a query inside a savepoint when a transaction is open.
     * PostgreSQL aborts the whole transaction after any failed statement.
     * A caught lookup must not do that to Google account linking.
     */
    public static function withinSavepoint(callable $fn): mixed
    {
        $pdo = self::pdo();
        if (!$pdo->inTransaction()) {
            return $fn();
        }
        $pdo->exec('SAVEPOINT gp_guard');
        try {
            $result = $fn();
            $pdo->exec('RELEASE SAVEPOINT gp_guard');
            return $result;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->exec('ROLLBACK TO SAVEPOINT gp_guard');
                $pdo->exec('RELEASE SAVEPOINT gp_guard');
            }
            throw $e;
        }
    }
}
