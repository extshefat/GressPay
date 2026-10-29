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
        if ($a === 'alerts' && $b === 'test' && $req->method === 'POST') {
            self::testAlert($actor, $req);
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
            'brandId' => $actor['brand_id'],
            'hasLiveKey' => $live !== null,
            'hasSandboxKey' => $test !== null,
            'livePublicKey' => $live ? $live['prefix'] . '…' : '',
            'liveSecretKey' => $live ? $live['prefix'] . '••••' : '',
            'sandboxPublicKey' => $test ? $test['prefix'] . '…' : '',
            'sandboxSecretKey' => $test ? $test['prefix'] . '••••' : '',
            'webhookSecret' => isset($brand['webhook_secret']) && (string) $brand['webhook_secret'] !== ''
                ? substr((string) $brand['webhook_secret'], 0, 8) . '••••'
                : '',
            'hasWebhookSecret' => isset($brand['webhook_secret']) && (string) $brand['webhook_secret'] !== '',
            'webhookUrl' => $brand['webhook_url'] ?? null,
            'note' => 'Full secrets are only returned once when you Create or Rotate. List views stay masked.',
        ]);
    }

    private static function rotate(array $actor, GpRequest $req): never
    {
        $mode = (string) $req->input('mode', 'live');
        if (!in_array($mode, ['live', 'test'], true)) {
            $mode = 'live';
        }
        $existing = GpDb::one(
            'SELECT id FROM gp_api_keys WHERE brand_id = ? AND mode = ? AND status = ?',
            [$actor['brand_id'], $mode, 'active']
        );
        $created = $existing === null;
        GpDb::exec(
            'UPDATE gp_api_keys SET status = ?, updated_at = ? WHERE brand_id = ? AND mode = ? AND status = ?',
            ['inactive', GpIds::now(), $actor['brand_id'], $mode, 'active']
        );
        $issued = GpAuth::issueKey(
            $actor['brand_id'],
            $mode,
            $created ? ('Default ' . $mode) : ('Rotated ' . $mode)
        );
        GpJson::send([
            'mode' => $mode,
            'key' => $issued['key'],
            'prefix' => $issued['prefix'],
            'created' => $created,
            'note' => 'Shown once. Copy and store this secret now — it cannot be retrieved again.',
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

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);

        GpJson::send([
            'businessName' => $brand['name'] ?? '',
            'brandName' => $merchant['brand_name'] ?? ($brand['name'] ?? ''),
            'brandLogoUrl' => $merchant['brand_logo_url'] ?? '',
            'supportContact' => $merchant['support_contact'] ?? '',
            'receiptFooter' => $merchant['receipt_footer'] ?? '',
            'telegramBotTokenSet' => trim((string) ($merchant['telegram_bot_token'] ?? '')) !== '',
            'telegramChatId' => $merchant['telegram_chat_id'] ?? '',
            'discordWebhookUrl' => $merchant['discord_webhook_url'] ?? '',
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
                'rocket' => $rail('rocket'),
                'upay' => $rail('upay'),
                'cellfin' => $rail('cellfin'),
                'usdt_trc20' => $rail('usdt_trc20'),
                'bybit_pay' => $rail('bybit_pay'),
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
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
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

        $brandName = trim((string) $req->input('brandName', $req->input('brand_name', $merchant['brand_name'] ?? $name)));
        $brandLogo = trim((string) $req->input('brandLogoUrl', $req->input('brand_logo_url', $merchant['brand_logo_url'] ?? '')));
        $support = trim((string) $req->input('supportContact', $req->input('support_contact', $merchant['support_contact'] ?? '')));
        $receiptFooter = trim((string) $req->input('receiptFooter', $req->input('receipt_footer', $merchant['receipt_footer'] ?? '')));
        $telegramChatId = trim((string) $req->input('telegramChatId', $req->input('telegram_chat_id', $merchant['telegram_chat_id'] ?? '')));
        $discordWebhook = trim((string) $req->input('discordWebhookUrl', $req->input('discord_webhook_url', $merchant['discord_webhook_url'] ?? '')));
        $telegramTokenIn = $req->input('telegramBotToken', $req->input('telegram_bot_token', null));
        $telegramToken = $merchant['telegram_bot_token'] ?? null;
        if ($telegramTokenIn !== null && trim((string) $telegramTokenIn) !== '') {
            $telegramToken = trim((string) $telegramTokenIn);
        }
        if ($req->input('clearTelegramBotToken', false) === true) {
            $telegramToken = null;
        }

        if ($brandLogo !== '' && !preg_match('#^https://#i', $brandLogo)) {
            GpJson::error('INVALID_URL', 'Brand logo URL must be HTTPS.', 400);
        }
        if ($discordWebhook !== '' && !preg_match('#^https://#i', $discordWebhook)) {
            GpJson::error('INVALID_URL', 'Discord webhook URL must be HTTPS.', 400);
        }

        GpDb::exec(
            'UPDATE gp_brands SET name = ?, webhook_url = ?, crypto_enabled = ?, updated_at = ? WHERE brand_id = ?',
            [$name !== '' ? $name : ($brandName ?: 'Store'), $webhook !== '' ? $webhook : null, $cryptoFlag, GpIds::now(), $actor['brand_id']]
        );
        GpDb::exec(
            'UPDATE gp_merchants SET brand_name = ?, brand_logo_url = ?, support_contact = ?, receipt_footer = ?, telegram_bot_token = ?, telegram_chat_id = ?, discord_webhook_url = ?, updated_at = ? WHERE merchant_id = ?',
            [
                $brandName !== '' ? $brandName : null,
                $brandLogo !== '' ? $brandLogo : null,
                $support !== '' ? $support : null,
                $receiptFooter !== '' ? $receiptFooter : null,
                $telegramToken,
                $telegramChatId !== '' ? $telegramChatId : null,
                $discordWebhook !== '' ? $discordWebhook : null,
                GpIds::now(),
                $actor['merchant_id'],
            ]
        );
        self::audit($actor, 'settings.update', ['cryptoEnabled' => (bool) $cryptoFlag, 'branding' => true]);
        self::getSettings($actor);
    }

    private static function testAlert(array $actor, GpRequest $req): never
    {
        GpRateLimiter::guard('merchant-alert-test:' . $actor['brand_id'], 10, 60);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $channel = strtolower(trim((string) $req->input('channel', 'telegram')));
        $message = 'GressPay test alert — your Instant Alerts channel is connected.';
        $results = ['telegram' => null, 'discord' => null];

        if ($channel === 'telegram' || $channel === 'all') {
            $token = trim((string) ($merchant['telegram_bot_token'] ?? ''));
            $chatId = trim((string) ($merchant['telegram_chat_id'] ?? ''));
            if ($token === '' || $chatId === '') {
                $results['telegram'] = ['ok' => false, 'error' => 'Telegram bot token or chat ID is not configured.'];
            } else {
                $url = 'https://api.telegram.org/bot' . rawurlencode($token) . '/sendMessage';
                $payload = json_encode(['chat_id' => $chatId, 'text' => $message], JSON_UNESCAPED_UNICODE);
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 8,
                ]);
                $body = curl_exec($ch);
                $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                $results['telegram'] = ['ok' => $code >= 200 && $code < 300, 'httpCode' => $code, 'body' => is_string($body) ? substr($body, 0, 200) : ''];
            }
        }

        if ($channel === 'discord' || $channel === 'all') {
            $hook = trim((string) ($merchant['discord_webhook_url'] ?? ''));
            if ($hook === '') {
                $results['discord'] = ['ok' => false, 'error' => 'Discord webhook URL is not configured.'];
            } else {
                $payload = json_encode(['content' => $message], JSON_UNESCAPED_UNICODE);
                $ch = curl_init($hook);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 8,
                ]);
                $body = curl_exec($ch);
                $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                $results['discord'] = ['ok' => $code >= 200 && $code < 300, 'httpCode' => $code];
            }
        }

        $ok = false;
        foreach ($results as $r) {
            if (is_array($r) && !empty($r['ok'])) {
                $ok = true;
            }
        }
        GpJson::send(['ok' => $ok, 'results' => $results, 'message' => $ok ? 'Test alert dispatched.' : 'No alert channel accepted the test.']);
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
