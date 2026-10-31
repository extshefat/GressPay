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
        if ($a === 'api-keys' && $b === 'create' && $req->method === 'POST') {
            self::createKey($actor, $req);
        }
        if ($a === 'api-keys' && $b === 'revoke' && $req->method === 'POST') {
            self::revokeKey($actor, $req);
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
        if ($a === 'notifications' && $req->method === 'GET') {
            self::getNotifications($actor);
        }
        if ($a === 'notifications' && $req->method === 'PUT') {
            self::putNotifications($actor, $req);
        }
        if ($a === 'support' && $req->method === 'GET') {
            self::listSupportTickets($actor);
        }
        if ($a === 'support' && $req->method === 'POST') {
            self::createSupportTicket($actor, $req);
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
        GpJson::send([
            'merchantId' => $actor['merchant_id'],
            'brandId' => $actor['brand_id'],
            'webhookSecret' => isset($brand['webhook_secret']) && (string) $brand['webhook_secret'] !== ''
                ? substr((string) $brand['webhook_secret'], 0, 8) . '••••'
                : '',
            'hasWebhookSecret' => isset($brand['webhook_secret']) && (string) $brand['webhook_secret'] !== '',
            'webhookUrl' => $brand['webhook_url'] ?? null,
            'checkoutUrl' => GpPlatform::publicApiBase() . '/payment/create',
            'verifyUrl' => GpPlatform::publicApiBase() . '/payment/verify',
            'note' => 'Website and device API keys live under Dashboard → Brands and Devices. This page is for webhook signing secrets.',
        ]);
    }

    private static function createKey(array $actor, GpRequest $req): never
    {
        $mode = (string) $req->input('mode', 'live');
        if ($mode === 'test') {
            GpJson::error(
                'FORBIDDEN',
                'Sandbox/test API keys are not issued from the merchant dashboard. Create or rotate keys under Brands.',
                403
            );
        }
        GpJson::error(
            'MOVED',
            'Website API keys are created per brand under Dashboard → Brands.',
            410
        );
    }

    private static function revokeKey(array $actor, GpRequest $req): never
    {
        $keyId = (int) $req->input('keyId', $req->input('id', 0));
        if ($keyId <= 0) {
            GpJson::error('MISSING_FIELD', 'keyId is required.', 400);
        }
        $row = GpDb::one(
            'SELECT * FROM gp_api_keys WHERE id = ? AND brand_id = ?',
            [$keyId, $actor['brand_id']]
        );
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'API key not found.', 404);
        }
        GpDb::exec(
            'UPDATE gp_api_keys SET status = ?, updated_at = ? WHERE id = ? AND brand_id = ?',
            ['inactive', GpIds::now(), $keyId, $actor['brand_id']]
        );
        GpJson::send(['ok' => true, 'keyId' => $keyId, 'note' => 'Key revoked. Requests using it will fail immediately.']);
    }

    private static function rotate(array $actor, GpRequest $req): never
    {
        $mode = (string) $req->input('mode', 'live');
        if ($mode === 'test') {
            GpJson::error(
                'FORBIDDEN',
                'Sandbox/test API keys are not issued from the merchant dashboard. Rotate the website key under Brands.',
                403
            );
        }
        GpJson::error(
            'MOVED',
            'Merchant-wide API key rotation moved to Dashboard → Brands (website key per brand).',
            410
        );
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
            'notifyPrefs' => self::readNotifyPrefs($merchant),
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

    /** @return array<string,bool> */
    private static function defaultNotifyPrefs(): array
    {
        return [
            'emailEnabled' => true,
            'inAppEnabled' => true,
            'paymentCompleted' => true,
            'paymentFailed' => true,
            'webhookDeliveryFailed' => true,
        ];
    }

    /** @param array<string,mixed>|null $merchant */
    private static function readNotifyPrefs(?array $merchant): array
    {
        $raw = is_array($merchant) ? (string) ($merchant['notify_prefs_json'] ?? '') : '';
        $decoded = $raw !== '' ? json_decode($raw, true) : null;
        if (!is_array($decoded)) {
            return self::defaultNotifyPrefs();
        }
        return array_merge(self::defaultNotifyPrefs(), array_intersect_key($decoded, self::defaultNotifyPrefs()));
    }

    /** @param array<string,mixed> $actor */
    private static function getNotifications(array $actor): never
    {
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        GpJson::send(['notifyPrefs' => self::readNotifyPrefs($merchant)]);
    }

    /** @param array<string,mixed> $actor */
    private static function putNotifications(array $actor, GpRequest $req): never
    {
        GpRateLimiter::guard('merchant-notify:' . $actor['brand_id'], 30, 60);
        $incoming = $req->input('notifyPrefs', $req->input('notify_prefs', []));
        if (!is_array($incoming)) {
            GpJson::error('VALIDATION', 'notifyPrefs object is required.', 400);
        }
        $merged = self::readNotifyPrefs(null);
        foreach (array_keys(self::defaultNotifyPrefs()) as $key) {
            if (array_key_exists($key, $incoming)) {
                $merged[$key] = filter_var($incoming[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $incoming[$key];
            }
        }
        GpDb::exec(
            'UPDATE gp_merchants SET notify_prefs_json = ?, updated_at = ? WHERE merchant_id = ?',
            [json_encode($merged, JSON_UNESCAPED_UNICODE), GpIds::now(), $actor['merchant_id']]
        );
        self::audit($actor, 'notifications.update', $merged);
        GpJson::send(['notifyPrefs' => $merged]);
    }

    /** @param array<string,mixed> $actor */
    private static function listSupportTickets(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT ticket_id, subject, status, contact_email, created_at, updated_at
             FROM gp_support_tickets
             WHERE merchant_id = ?
             ORDER BY id DESC
             LIMIT 50',
            [$actor['merchant_id']]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'ticketId' => (string) ($r['ticket_id'] ?? ''),
                'subject' => (string) ($r['subject'] ?? ''),
                'status' => (string) ($r['status'] ?? 'open'),
                'contactEmail' => (string) ($r['contact_email'] ?? ''),
                'createdAt' => (string) ($r['created_at'] ?? ''),
                'updatedAt' => (string) ($r['updated_at'] ?? ''),
            ];
        }
        GpJson::send(['tickets' => $out]);
    }

    /** @param array<string,mixed> $actor */
    private static function createSupportTicket(array $actor, GpRequest $req): never
    {
        GpRateLimiter::guard('merchant-support:' . $actor['merchant_id'], 10, 3600);
        $subject = trim((string) $req->input('subject', ''));
        $message = trim((string) $req->input('message', ''));
        $email = trim((string) $req->input('contactEmail', $req->input('email', '')));
        if ($subject === '' || $message === '') {
            GpJson::error('VALIDATION', 'subject and message are required.', 400);
        }
        if (strlen($subject) > 200) {
            GpJson::error('VALIDATION', 'subject is too long.', 400);
        }
        if (strlen($message) > 8000) {
            GpJson::error('VALIDATION', 'message is too long.', 400);
        }
        $merchant = GpDb::one('SELECT email FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        if ($email === '' && is_array($merchant)) {
            $email = trim((string) ($merchant['email'] ?? ''));
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            GpJson::error('VALIDATION', 'A valid contactEmail is required.', 400);
        }
        $now = GpIds::now();
        $ticketId = GpIds::make('tkt', 8);
        GpDb::exec(
            'INSERT INTO gp_support_tickets (ticket_id, merchant_id, brand_id, contact_email, subject, message, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$ticketId, $actor['merchant_id'], $actor['brand_id'], $email, $subject, $message, 'open', $now, $now]
        );
        self::audit($actor, 'support.ticket', ['ticketId' => $ticketId, 'subject' => $subject]);
        GpJson::send([
            'ticketId' => $ticketId,
            'status' => 'open',
            'message' => 'Support ticket received. We will follow up by email when configured on the platform.',
        ], 201);
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
