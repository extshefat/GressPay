<?php
declare(strict_types=1);

final class MerchantController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $a = $req->part(1);
        $b = $req->part(2);

        if ($a === 'api-keys' && $req->method === 'GET') {
            self::keys($actor);
        }
        if ($a === 'api-keys' && $b === 'rotate' && $req->method === 'POST') {
            self::rotate($actor, $req);
        }
        if ($a === 'webhook-secret' && $b === 'rotate' && $req->method === 'POST') {
            self::rotateWebhookSecret($actor);
        }
        if ($a === 'settings' && $req->method === 'GET') {
            self::getSettings($actor);
        }
        if ($a === 'settings' && $req->method === 'PUT') {
            self::putSettings($actor, $req);
        }
        if ($a === 'binance-pay' && $req->method === 'PUT') {
            self::putBinancePay($actor, $req);
        }
        if ($a === 'binance-pay' && $req->method === 'GET') {
            self::getBinancePay($actor);
        }
        GpJson::error('NOT_FOUND', 'Unknown merchant route.', 404);
    }

    public static function keys(array $actor): never
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $keys = GpDb::all('SELECT * FROM gp_api_keys WHERE brand_id = ? ORDER BY id ASC', [$actor['brand_id']]);
        $live = null;
        $test = null;
        foreach ($keys as $k) {
            if ($k['mode'] === 'live' && $k['status'] === 'active' && $live === null) {
                $live = $k;
            }
            if ($k['mode'] === 'test' && $k['status'] === 'active' && $test === null) {
                $test = $k;
            }
        }
        GpJson::send([
            'merchantId' => $actor['merchant_id'],
            'livePublicKey' => $live ? $live['prefix'] . '…' : '',
            'liveSecretKey' => $live ? $live['prefix'] . '••••' : '',
            'sandboxPublicKey' => $test ? $test['prefix'] . '…' : '',
            'sandboxSecretKey' => $test ? $test['prefix'] . '••••' : '',
            'webhookSecret' => isset($brand['webhook_secret']) ? substr((string) $brand['webhook_secret'], 0, 8) . '••••' : '',
            'webhookUrl' => $brand['webhook_url'] ?? null,
        ]);
    }

    private static function rotate(array $actor, GpRequest $req): never
    {
        $mode = (string) $req->input('mode', 'live');
        if (!in_array($mode, ['live', 'test'], true)) {
            $mode = 'live';
        }
        GpDb::exec(
            'UPDATE gp_api_keys SET status = ?, updated_at = ? WHERE brand_id = ? AND mode = ? AND status = ?',
            ['inactive', GpIds::now(), $actor['brand_id'], $mode, 'active']
        );
        $issued = GpAuth::issueKey($actor['brand_id'], $mode, 'Rotated ' . $mode);
        GpJson::send([
            'mode' => $mode,
            'key' => $issued['key'],
            'note' => 'Shown once. Store it now.',
        ]);
    }

    /** Issue a new webhook HMAC secret (plaintext once). */
    private static function rotateWebhookSecret(array $actor): never
    {
        $secret = 'gpwh_' . bin2hex(random_bytes(24));
        GpDb::exec(
            'UPDATE gp_brands SET webhook_secret = ?, updated_at = ? WHERE brand_id = ?',
            [$secret, GpIds::now(), $actor['brand_id']]
        );
        GpJson::send([
            'webhookSecret' => $secret,
            'note' => 'Shown once. Use this to verify X-GressPay-Signature (HMAC-SHA256 of raw body).',
        ]);
    }

    private static function getSettings(array $actor): never
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $configured = BinancePayClient::brandHasSealedCredentials($brand ?? []);
        $methods = GpDb::all('SELECT code, status, options FROM gp_methods WHERE brand_id = ?', [$actor['brand_id']]);
        $byCode = [];
        foreach ($methods as $m) {
            $byCode[GpCatalog::publicCode((string) $m['code'])] = $m;
        }
        $deviceCount = (int) (GpDb::one(
            'SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = ?',
            [$actor['brand_id'], 'active']
        )['c'] ?? 0);

        $rail = static function (string $code) use ($byCode): array {
            $row = $byCode[$code] ?? null;
            $opts = is_array($row) ? (json_decode((string) ($row['options'] ?? '{}'), true) ?: []) : [];
            $dest = trim((string) ($opts['account'] ?? $opts['depositAddressOrNumber'] ?? $opts['mobile_number'] ?? ''));
            return [
                'enabled' => is_array($row) && strtolower((string) ($row['status'] ?? '')) === 'active',
                'destinationConfigured' => $dest !== '',
            ];
        };

        GpJson::send([
            'businessName' => $brand['name'] ?? '',
            'webhookUrl' => $brand['webhook_url'] ?? '',
            'currency' => $brand['currency_code'] ?? 'BDT',
            'cryptoEnabled' => !empty($brand['crypto_enabled']),
            'operatorCryptoAllowed' => GpConfig::cryptoAllowed(),
            'tronProviderConfigured' => GpConfig::tronApiKey() !== '' || !GpConfig::isProduction(),
            'usdtConfirmations' => GpConfig::usdtConfirmations(),
            'usdtContract' => GpConfig::usdtTrc20Contract(),
            'binancePayConfigured' => $configured,
            'activeCompanionDevices' => $deviceCount,
            'rails' => [
                'bkash' => $rail('bkash'),
                'nagad' => $rail('nagad'),
                'usdt_trc20' => $rail('usdt_trc20'),
                'binance_pay' => [
                    'enabled' => ($byCode['binance_pay']['status'] ?? '') === 'active',
                    'credentialsConfigured' => $configured,
                ],
            ],
        ]);
    }

    private static function putSettings(array $actor, GpRequest $req): never
    {
        GpRateLimiter::guard('merchant-settings:' . $actor['brand_id'], 30, 60);
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        // Reject provider secrets smuggled into generic settings.
        foreach (['apiKey', 'secret', 'apiSecret', 'certificateSn', 'binancePay', 'account'] as $bad) {
            if ($req->input($bad, null) !== null) {
                GpJson::error('REJECTED_FIELD', 'Use dedicated provider endpoints for credentials and method destinations.', 400);
            }
        }
        $name = trim((string) $req->input('businessName', $req->input('name', $brand['name'])));
        $webhook = trim((string) $req->input('webhookUrl', $req->input('webhook_url', $brand['webhook_url'] ?? '')));
        if ($webhook !== '') {
            $check = GpWebhook::validateDestination($webhook);
            if (!$check['ok']) {
                GpJson::error('INVALID_URL', 'webhookUrl rejected (' . ($check['error'] ?? 'unsafe') . '). Must be HTTPS and non-private.');
            }
        }
        $crypto = $req->input('cryptoEnabled', $req->input('crypto_enabled', null));
        $cryptoFlag = $brand['crypto_enabled'] ?? 0;
        if ($crypto !== null) {
            $cryptoFlag = ($crypto === true || $crypto === 1 || $crypto === '1' || $crypto === 'true') ? 1 : 0;
        }
        GpDb::exec(
            'UPDATE gp_brands SET name = ?, webhook_url = ?, crypto_enabled = ?, updated_at = ? WHERE brand_id = ?',
            [$name, $webhook !== '' ? $webhook : null, $cryptoFlag, GpIds::now(), $actor['brand_id']]
        );
        self::audit($actor, 'settings.update', ['cryptoEnabled' => (bool) $cryptoFlag]);
        self::getSettings($actor);
    }

    private static function getBinancePay(array $actor): never
    {
        GpAuth::requireScope($actor, 'manage_provider');
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $configured = BinancePayClient::brandHasSealedCredentials($brand ?? []);
        // Status only — never open or return secrets.
        $payload = [
            'configured' => $configured,
            'certificateSnSet' => $configured,
            'liveReady' => $configured && GpConfig::cryptoAllowed() && !empty($brand['crypto_enabled']),
            'note' => 'Binance Pay Merchant API credentials only. Secrets are write-only and never returned. Not Spot trading keys.',
        ];
        $encoded = json_encode($payload);
        if ($encoded !== false && (str_contains($encoded, 'apiKey') || str_contains(strtolower($encoded), 'secret'))) {
            // Defensive: response schema must never include those keys.
            GpJson::error('SERVER_ERROR', 'Unexpected response shape.', 500);
        }
        GpJson::send($payload);
    }

    private static function putBinancePay(array $actor, GpRequest $req): never
    {
        GpAuth::requireScope($actor, 'manage_provider');
        GpRateLimiter::guard('binance-creds:' . $actor['brand_id'], 10, 60);

        $clear = $req->input('clear', false);
        if ($clear === true || $clear === 1 || $clear === '1' || $clear === 'true') {
            GpDb::exec(
                'UPDATE gp_brands SET binance_pay_json = NULL, updated_at = ? WHERE brand_id = ?',
                [GpIds::now(), $actor['brand_id']]
            );
            self::audit($actor, 'binance_pay.clear', []);
            self::getBinancePay($actor);
        }

        $apiKey = trim((string) $req->input('apiKey', ''));
        $secret = trim((string) $req->input('secret', $req->input('apiSecret', '')));
        $sn = trim((string) $req->input('certificateSn', $req->input('certificate_sn', '')));
        if ($apiKey === '' || $secret === '' || $sn === '') {
            GpJson::error('MISSING_FIELD', 'apiKey, secret, and certificateSn are required (or set clear=true).');
        }
        $sealed = GpCrypto::seal(json_encode([
            'apiKey' => $apiKey,
            'secret' => $secret,
            'certificateSn' => $sn,
        ], JSON_UNESCAPED_SLASHES));
        GpDb::exec(
            'UPDATE gp_brands SET binance_pay_json = ?, updated_at = ? WHERE brand_id = ?',
            [$sealed, GpIds::now(), $actor['brand_id']]
        );
        self::audit($actor, 'binance_pay.save', ['certificateSnLen' => strlen($sn)]);
        self::getBinancePay($actor);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor */
    private static function audit(array $actor, string $action, array $meta): void
    {
        try {
            GpDb::exec(
                'INSERT INTO gp_audit_log (brand_id, session_id, actor_id, action, meta_json, created_at)
                 VALUES (?, NULL, ?, ?, ?, ?)',
                [
                    $actor['brand_id'],
                    $actor['merchant_id'] ?? null,
                    $action,
                    json_encode($meta, JSON_UNESCAPED_SLASHES),
                    GpIds::now(),
                ]
            );
        } catch (Throwable $e) {
            // non-fatal
        }
    }
}
