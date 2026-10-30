<?php
declare(strict_types=1);

final class GpConfig
{
    private static array $env = [];
    private static bool $productionChecked = false;

    public static function load(): void
    {
        $path = GRESSPAY_ROOT . '/.env';
        $example = GRESSPAY_ROOT . '/.env.example';
        $file = is_file($path) ? $path : $example;
        if (!is_file($file)) {
            return;
        }
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$k, $v] = explode('=', $line, 2);
            self::$env[trim($k)] = trim($v);
        }
        foreach ($_ENV as $k => $v) {
            if (is_string($v)) {
                self::$env[$k] = $v;
            }
        }
        foreach ($_SERVER as $k => $v) {
            if (is_string($k) && is_string($v) && !array_key_exists($k, self::$env)) {
                // Prefer real process env over .env.example when already set by the host.
                if (getenv($k) !== false) {
                    self::$env[$k] = (string) getenv($k);
                }
            }
        }
        // Overlay actual getenv for critical keys (Docker/K8s).
        foreach ([
            'APP_ENV', 'APP_URL', 'JWT_SECRET', 'APP_ENCRYPTION_KEY',
            'DB_DRIVER', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_SSLMODE',
            'DB_CONNECTION', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD',
            'GRESSPAY_CRYPTO_ALLOWED', 'ADMIN_EMAIL', 'ADMIN_EMAILS',
            'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
            'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
            'R2_BUCKET_NAME', 'R2_ENDPOINT', 'R2_PUBLIC_BASE_URL'
        ] as $k) {
            $g = getenv($k);
            if ($g !== false && $g !== '') {
                self::$env[$k] = $g;
            }
        }
    }

    public static function get(string $key, string $default = ''): string
    {
        $value = self::$env[$key] ?? '';
        if ($value === '') {
            $aliases = [
                'DB_NAME' => ['DB_DATABASE'],
                'DB_USER' => ['DB_USERNAME'],
                'DB_PASS' => ['DB_PASSWORD'],
                'DB_DRIVER' => ['DB_CONNECTION'],
                'SQLITE_PATH' => ['DB_SQLITE_PATH'],
            ];
            foreach ($aliases[$key] ?? [] as $alt) {
                $candidate = self::$env[$alt] ?? '';
                if ($candidate !== '') {
                    $value = $candidate;
                    break;
                }
            }
        }
        if ($key === 'DB_DRIVER' && $value !== '') {
            $value = self::normalizeDbDriver($value);
        }
        return $value !== '' ? $value : $default;
    }

    /** Keep PostgreSQL as pgsql. A private VPC Postgres must not be contacted with the MySQL protocol. */
    public static function normalizeDbDriver(string $value): string
    {
        $value = strtolower(trim($value));
        return match ($value) {
            'sqlite' => 'sqlite',
            'pgsql', 'postgres', 'postgresql' => 'pgsql',
            'mysql', 'mariadb' => 'mysql',
            default => $value,
        };
    }

    public static function isProduction(): bool
    {
        return strtolower(self::get('APP_ENV', 'production')) === 'production';
    }

    public static function isDevelopment(): bool
    {
        $env = strtolower(self::get('APP_ENV', 'production'));
        return in_array($env, ['development', 'dev', 'local', 'test'], true);
    }

    /**
     * Fail closed in production when secrets are missing or placeholder-weak.
     * Call once after load (from bootstrap).
     */
    public static function assertProductionSecrets(): void
    {
        if (self::$productionChecked || !self::isProduction()) {
            return;
        }
        self::$productionChecked = true;

        $weak = [
            '',
            'change-me',
            'change-root',
            'change-this-to-a-long-random-string',
            'changeme',
            'secret',
            'password',
        ];

        $jwt = self::get('JWT_SECRET', '');
        if (in_array($jwt, $weak, true) || strlen($jwt) < 32) {
            self::fatal(
                'JWT_SECRET must be set to a strong random value (≥32 chars) when APP_ENV=production. '
                . 'Do not use .env.example placeholders.'
            );
        }

        $enc = self::get('APP_ENCRYPTION_KEY', '');
        if (in_array($enc, $weak, true) || strlen($enc) < 32) {
            self::fatal(
                'APP_ENCRYPTION_KEY must be set (≥32 chars) when APP_ENV=production. '
                . 'Used to encrypt provider credentials at rest.'
            );
        }

        $drv = strtolower(self::get('DB_DRIVER', 'sqlite'));
        if (in_array($drv, ['mysql', 'pgsql'], true)) {
            $pass = self::get('DB_PASS', '');
            if (in_array($pass, $weak, true)) {
                self::fatal("DB_PASS must be set to a non-placeholder value when APP_ENV=production and DB_DRIVER={$drv}.");
            }
        }
    }

    private static function fatal(string $message): never
    {
        if (!headers_sent()) {
            http_response_code(503);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'ok' => false,
            'error' => [
                'code' => 'CONFIG_ERROR',
                'message' => $message,
            ],
        ], JSON_UNESCAPED_SLASHES);
        exit(1);
    }

    public static function corsOrigins(): array
    {
        $raw = self::get('CORS_ORIGINS', 'http://localhost:3000');
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    public static function jwtSecret(): string
    {
        $secret = self::get('JWT_SECRET', '');
        $weak = ['', 'change-this-to-a-long-random-string'];
        if (in_array($secret, $weak, true) || strlen($secret) < 16) {
            if (self::isProduction()) {
                self::fatal('JWT_SECRET is missing or weak in production.');
            }
            // Dev-only deterministic fallback — never used when APP_ENV=production.
            return hash('sha256', GRESSPAY_ROOT . '|gresspay-dev');
        }
        return $secret;
    }

    public static function encryptionKey(): string
    {
        $key = self::get('APP_ENCRYPTION_KEY', '');
        if ($key === '' || strlen($key) < 16) {
            if (self::isProduction()) {
                self::fatal('APP_ENCRYPTION_KEY is missing in production.');
            }
            return hash('sha256', self::jwtSecret() . '|enc');
        }
        return hash('sha256', $key, true);
    }

    /** Operator allowed crypto rails (Binance Pay / USDT). Default: on (1). */
    public static function cryptoAllowed(): bool
    {
        return self::get('GRESSPAY_CRYPTO_ALLOWED', '1') === '1';
    }

    public static function tronApiBase(): string
    {
        return rtrim(self::get('TRON_API_BASE', 'https://api.trongrid.io'), '/');
    }

    public static function tronApiKey(): string
    {
        return self::get('TRON_API_KEY', '');
    }

    public static function usdtTrc20Contract(): string
    {
        // Canonical mainnet USDT TRC-20
        return self::get('USDT_TRC20_CONTRACT', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    }

    public static function usdtConfirmations(): int
    {
        $n = (int) self::get('USDT_CONFIRMATIONS', '20');
        return max(1, min(100, $n));
    }

    public static function webhookMaxRetries(): int
    {
        $g = getenv('WEBHOOK_MAX_RETRIES');
        $n = ($g !== false && $g !== '') ? (int) $g : (int) self::get('WEBHOOK_MAX_RETRIES', '5');
        return max(1, min(10, $n));
    }

    public static function webhookTimeoutSeconds(): int
    {
        $g = getenv('WEBHOOK_TIMEOUT_SECONDS');
        $n = ($g !== false && $g !== '') ? (int) $g : (int) self::get('WEBHOOK_TIMEOUT_SECONDS', '8');
        return max(2, min(30, $n));
    }

    public static function publicAppUrl(): string
    {
        return rtrim(self::get('APP_URL', self::get('PUBLIC_APP_URL', '')), '/');
    }

    public static function binancePayBase(): string
    {
        return rtrim(self::get('BINANCE_PAY_API_BASE', 'https://bpay.binanceapi.com'), '/');
    }

    public static function r2AccountId(): string
    {
        return self::get('R2_ACCOUNT_ID', '');
    }

    public static function r2Bucket(): string
    {
        return self::get('R2_BUCKET_NAME', '');
    }

    public static function r2AccessKeyId(): string
    {
        return self::get('R2_ACCESS_KEY_ID', '');
    }

    public static function r2SecretAccessKey(): string
    {
        return self::get('R2_SECRET_ACCESS_KEY', '');
    }

    public static function r2Endpoint(): string
    {
        $ep = self::get('R2_ENDPOINT', '');
        if ($ep !== '') {
            return rtrim($ep, '/');
        }
        $acct = self::r2AccountId();
        return $acct !== '' ? ('https://' . $acct . '.r2.cloudflarestorage.com') : '';
    }

    public static function r2PresignTtl(): int
    {
        return max(60, min(3600, (int) self::get('R2_PRESIGN_TTL_SECONDS', '300')));
    }

    public static function r2MaxUploadBytes(): int
    {
        return max(1024, min(20 * 1024 * 1024, (int) self::get('R2_MAX_UPLOAD_BYTES', '5242880')));
    }

    /** Optional dedicated public QR CDN base — unused when empty (presigned GET only). */
    public static function r2PublicBaseUrl(): string
    {
        return rtrim(self::get('R2_PUBLIC_BASE_URL', ''), '/');
    }

    public static function r2Configured(): bool
    {
        return self::r2Bucket() !== ''
            && self::r2AccessKeyId() !== ''
            && self::r2SecretAccessKey() !== ''
            && self::r2Endpoint() !== '';
    }
/**
     * Comma-separated allowlist of administrator Gmail / email addresses.
     * Enforced strictly server-side.
     *
     * @return list<string>
     */
    public static function adminEmails(): array
    {
        $raw = trim(self::get('ADMIN_EMAIL', self::get('ADMIN_EMAILS', '')));
        if ($raw === '') {
            return [];
        }
        $emails = [];
        foreach (explode(',', $raw) as $part) {
            $e = strtolower(trim($part));
            if ($e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $e;
            }
        }
        return array_values(array_unique($emails));
    }

    public static function isAdminEmail(string $email): bool
    {
        return self::isAdmin($email);
    }

    public static function isAdmin(string $email): bool
    {
        $email = strtolower(trim($email));
        if ($email === '') {
            return false;
        }
        try {
            $row = GpDb::withinSavepoint(
                static fn () => GpDb::one('SELECT allowed FROM gp_admin_overrides WHERE email = ?', [$email])
            );
            if (is_array($row)) {
                return (int) ($row['allowed'] ?? 0) === 1;
            }
        } catch (Throwable $e) {
            // Table is created on boot. Fall through to the environment allowlist.
        }
        return in_array($email, self::adminEmails(), true);
    }
}
