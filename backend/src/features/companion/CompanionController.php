<?php
declare(strict_types=1);

final class CompanionController
{
    /** Devices with last_seen within this window are considered online in dashboard UI. */
    public const ONLINE_WINDOW_SEC = 600;

    public static function handle(GpRequest $req): never
    {
        $action = $req->part(1) ?? '';
        $devicePart = $req->part(2);

        if ($req->method === 'GET' && $action === 'devices') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'view');
            self::listDevices($actor);
        }

        if ($req->method === 'POST' && $action === 'register') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'create');
            $brandId = trim((string) $req->input('brandId', $actor['brand_id']));
            if ($brandId === '') {
                $brandId = GpAuth::requireBrandContext($actor, 'Create a brand under Dashboard → Brands before registering a device.');
            }
            $brand = GpDb::one(
                'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$brandId, $actor['merchant_id']]
            );
            if ($brand === null || !GpTeam::actorCanAccessBrand($actor, $brand)) {
                GpJson::error('NOT_FOUND', 'Brand not found for your account.', 404);
            }
            GpPlatform::assertDeviceRegistrationAllowed($brandId);
            $now = GpIds::now();
            $deviceId = GpIds::make('dev', 8);
            $plain = 'gpdev_' . bin2hex(random_bytes(20));
            $label = trim((string) $req->input('label', 'Android companion'));
            GpDb::exec(
                'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, token_sealed, token_prefix, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $deviceId,
                    $brandId,
                    $label,
                    password_hash($plain, PASSWORD_BCRYPT),
                    GpCrypto::seal($plain),
                    substr($plain, 0, 12),
                    'active',
                    $now,
                    $now,
                ]
            );
            GpJson::send([
                'deviceId' => $deviceId,
                'brandId' => $brandId,
                'brandName' => (string) ($brand['name'] ?? ''),
                'token' => $plain,
                'deviceAppKey' => $plain,
                'note' => 'Device API key for the Companion app. Re-copy anytime from Devices.',
            ], 201);
        }

        if ($req->method === 'POST' && $action === 'devices' && $devicePart !== null && $req->part(3) === 'revoke') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'delete');
            $n = GpDb::exec(
                'UPDATE gp_devices SET status = ?, updated_at = ?
                 WHERE device_id = ? AND brand_id IN (SELECT brand_id FROM gp_brands WHERE merchant_id = ?)',
                ['revoked', GpIds::now(), $devicePart, $actor['merchant_id']]
            );
            if ($n === 0) {
                GpJson::error('NOT_FOUND', 'Device not found.', 404);
            }
            GpJson::send(['ok' => true, 'deviceId' => $devicePart, 'status' => 'revoked']);
        }

        if ($req->method === 'POST' && $action === 'devices' && $devicePart !== null && $req->part(3) === 'rotate') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'edit');
            $dev = GpDb::one(
                'SELECT d.* FROM gp_devices d
                 INNER JOIN gp_brands b ON b.brand_id = d.brand_id
                 WHERE d.device_id = ? AND b.merchant_id = ?',
                [$devicePart, $actor['merchant_id']]
            );
            if ($dev === null) {
                GpJson::error('NOT_FOUND', 'Device not found.', 404);
            }
            $plain = 'gpdev_' . bin2hex(random_bytes(20));
            GpDb::exec(
                'UPDATE gp_devices SET token_hash = ?, token_sealed = ?, token_prefix = ?, status = ?, updated_at = ? WHERE device_id = ?',
                [password_hash($plain, PASSWORD_BCRYPT), GpCrypto::seal($plain), substr($plain, 0, 12), 'active', GpIds::now(), $devicePart]
            );
            GpJson::send([
                'deviceId' => $devicePart,
                'token' => $plain,
                'deviceAppKey' => $plain,
                'note' => 'Device API key rotated. Copy anytime from the Devices table.',
            ]);
        }

        if ($req->method === 'PUT' && $action === 'devices' && $devicePart !== null && $req->part(3) === 'bind') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'edit');
            self::bindDeviceGateway($actor, $devicePart, $req);
        }

        if ($req->method === 'GET' && $action === 'sms-logs') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            GpTeam::requireCan($actor, 'devices', 'view');
            self::listSmsLogs($actor);
        }

        if ($req->method === 'GET' && $action === 'public-config') {
            GpJson::send([
                'apiBaseUrl' => GpPlatform::publicSiteRoot(),
                'apiVersion' => 'v1',
            ]);
        }

        if ($req->method === 'POST' && $action === 'verify') {
            GpRateLimiter::guard('verify:' . GpRateLimiter::ip(), 60, 60);
            $device = self::authenticateActiveDevice($req);
            self::touchLastSeen($device);
            GpJson::send(self::pairingPayload($device));
        }

        if ($req->method === 'POST' && $action === 'heartbeat') {
            GpRateLimiter::guard('heartbeat:' . GpRateLimiter::ip(), 120, 60);
            $device = self::authenticateActiveDevice($req);
            self::touchLastSeen($device);
            GpJson::send(array_merge(self::pairingPayload($device), [
                'lastSeenAt' => GpIds::now(),
                'onlineWindowSec' => self::ONLINE_WINDOW_SEC,
            ]));
        }

        if ($req->method === 'POST' && $action === 'sms') {
            GpRateLimiter::guard('sms:' . GpRateLimiter::ip(), 120, 60);
            $device = self::authenticateActiveDevice($req);
            self::touchLastSeen($device);

            $sender = GpCatalog::publicCode((string) $req->input('sender_key', $req->input('senderKey', '')));
            if (!in_array($sender, ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'], true)) {
                GpJson::error('UNSUPPORTED_RAIL', 'Companion SMS matching supports bKash, Nagad, Rocket, Upay, and Cellfin.');
            }

            $idem = trim((string) $req->input('idempotency_key', $req->input('idempotencyKey', '')));

            $plugin = GpCatalog::loadPlugin($sender);
            $trxId = trim((string) $req->input('trx_id', $req->input('trxId', '')));
            if ($plugin) {
                $trxId = $plugin->normalizeTrx($trxId);
            }
            $trxId = strtoupper(trim($trxId));
            $amount = GpMoney::sanitize((string) $req->input('amount', '0'));
            $receivedAtMs = filter_var($req->input('received_at_ms', null), FILTER_VALIDATE_INT);
            if ($receivedAtMs === false || $receivedAtMs === null || $receivedAtMs <= 0
                || $receivedAtMs > (time() + 300) * 1000) {
                GpJson::error('INVALID_SMS_TIME', 'A valid original SMS timestamp is required.', 400);
            }
            $receivedAt = gmdate('Y-m-d\TH:i:s\Z', intdiv($receivedAtMs, 1000));
            if ($trxId === '' || (float) $amount <= 0) {
                GpJson::error('VALIDATION', 'trx_id and amount are required.');
            }

            $boundGatewayId = trim((string) ($device['bound_gateway_id'] ?? ''));
            if ($boundGatewayId !== '') {
                $boundGateway = GpDb::one(
                    'SELECT method_code FROM gp_gateways WHERE brand_id = ? AND gateway_id = ? AND status = ?',
                    [$device['brand_id'], $boundGatewayId, 'active']
                );
                if ($boundGateway === null || GpCatalog::publicCode((string) $boundGateway['method_code']) !== $sender) {
                    GpJson::error('DEVICE_RAIL_MISMATCH', 'Device is bound to a different or inactive gateway.', 409);
                }
            }

            // A retry may be delivered after checkout has claimed this SMS.
            // Return success for the same evidence, but reject key reuse with changed data.
            $smsNumber = self::resolveSmsWalletNumber($device, (string) $req->input('number', ''), $sender);
            $payerPhone = preg_replace('/\D+/', '', (string) $req->input('payer_phone', '')) ?: '';
            $payerPhone = preg_match('/^(?:880|0)?1[3-9][0-9]{8}$/', $payerPhone) ? '0' . substr($payerPhone, -10) : null;
            if ($idem !== '') {
                $prior = GpDb::one(
                    'SELECT * FROM gp_sms_data WHERE brand_id = ? AND idempotency_key = ?',
                    [$device['brand_id'], $idem]
                );
                if ($prior !== null) {
                    if (!self::sameSmsEvidence($prior, $sender, $amount, $trxId, $smsNumber, $receivedAt)) {
                        GpJson::error('CONFLICTING_SMS', 'Idempotency key already belongs to different SMS evidence.', 409);
                    }
                    if ((string) $prior['status'] === 'used') {
                        GpJson::send(['ok' => true, 'matched' => true, 'idempotent' => true]);
                    }
                }
            }

            // Anti-Fraud: Strict uniqueness check against completed orders and used SMS
            $alreadyCompleted = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ? AND trx_id = ? AND status = ?',
                [$device['brand_id'], 'live', strtoupper($trxId), 'completed']
            );
            if ($alreadyCompleted) {
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }

            $used = GpDb::one(
                'SELECT id FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ?',
                [$device['brand_id'], strtoupper($trxId), 'used']
            );
            if ($used) {
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }

            $existingApproved = GpDb::one(
                'SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ?',
                [$device['brand_id'], strtoupper($trxId), 'approved']
            );
            $now = GpIds::now();
            // Prefer device-bound wallet digits for matching (APK still sends SMS shortcode as number).
            // Audit: store amount/trx/sender/device — never full SMS body.
            if ($existingApproved) {
                if (!self::sameSmsEvidence($existingApproved, $sender, $amount, $trxId, $smsNumber, $receivedAt)) {
                    GpJson::error('CONFLICTING_SMS', 'This transaction ID already has different SMS evidence.', 409);
                }
                // A retry may arrive after the buyer opens checkout. Reconcile it below,
                // but never rewrite the original evidence or its receiving wallet.
            } else {
                try {
                    GpDb::exec(
                        'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, received_at, payer_phone, number, status, device_id, idempotency_key, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            $device['brand_id'],
                            $sender,
                            $amount,
                            $trxId,
                            $receivedAt,
                            $payerPhone,
                            $smsNumber,
                            'approved',
                            $device['device_id'],
                            $idem !== '' ? $idem : null,
                            $now,
                            $now,
                        ]
                    );
                } catch (Throwable $e) {
                    GpJson::error('DUPLICATE_SMS', 'Concurrent duplicate SMS rejected.');
                }
            }

            $pendingCandidates = GpDb::all(
                'SELECT * FROM gp_transactions WHERE brand_id = ? AND trx_id = ? AND status IN (?, ?) ORDER BY id ASC LIMIT 40',
                [$device['brand_id'], strtoupper($trxId), 'pending', 'initiated']
            );
            // sms_auto: pending checkouts may have no trx_id yet — scan concurrent candidates by amount/wallet.
            if ($pendingCandidates === []) {
                $brandMode = GpDb::one(
                    'SELECT verification_mode FROM gp_brands WHERE brand_id = ?',
                    [$device['brand_id']]
                );
                if (GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') === '1'
                    && is_array($brandMode) && strtolower((string) ($brandMode['verification_mode'] ?? '')) === 'sms_auto') {
                    $pendingCandidates = GpDb::all(
                        "SELECT * FROM gp_transactions
                         WHERE brand_id = ? AND status IN (?, ?)
                           AND (method_code = ? OR method_code = ?)
                           AND (trx_id IS NULL OR trx_id = '')
                         ORDER BY id ASC
                         LIMIT 40",
                        [$device['brand_id'], 'pending', 'initiated', $sender, GpCatalog::slug($sender)]
                    );
                }
            }
            // Collect full rule matches first. If more than one pending satisfies the same SMS
            // (amount/wallet/rail), leave unsettled to avoid amount-tied ambiguity.
            $hits = [];
            foreach ($pendingCandidates as $pending) {
                $methodCode = GpCatalog::publicCode((string) ($pending['method_code'] ?: $sender));
                if ($methodCode !== $sender) {
                    continue;
                }
                $cat = GpCatalog::find($methodCode);
                $payable = CheckoutController::submittedAmount($pending, (string) ($cat['currency'] ?? $pending['currency']));
                $gwAccount = null;
                if (!empty($pending['gateway_id'])) {
                    $gwRow = GpDb::one(
                        'SELECT account FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
                        [$pending['brand_id'], $pending['gateway_id']]
                    );
                    $gwAccount = $gwRow ? (string) ($gwRow['account'] ?? '') : null;
                }
                if (empty($pending['trx_id']) && CheckoutController::matchingSmsByAmount(
                    (string) $pending['brand_id'], $payable, $methodCode,
                    isset($pending['gateway_id']) ? (string) $pending['gateway_id'] : null, $gwAccount, $pending
                ) === null) {
                    continue;
                }
                $sms = CheckoutController::matchingSms(
                    $pending['brand_id'],
                    $trxId,
                    $payable,
                    $methodCode,
                    isset($pending['gateway_id']) ? (string) $pending['gateway_id'] : null,
                    $gwAccount,
                    $pending
                );
                if ($sms === null) {
                    continue;
                }
                $hits[] = [
                    'pending' => $pending,
                    'methodCode' => $methodCode,
                    'cat' => $cat,
                    'payable' => $payable,
                    'sms' => $sms,
                ];
            }

            $matched = false;
            if (count($hits) === 1) {
                $hit = $hits[0];
                $pending = $hit['pending'];
                $methodCode = $hit['methodCode'];
                $cat = $hit['cat'];
                $methodRow = GpDb::one(
                    'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
                    [$pending['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
                ) ?? ['options' => '{}', 'code' => $methodCode];
                $paid = CheckoutController::markPaid(
                    $pending,
                    $trxId,
                    $methodCode,
                    $methodRow,
                    $hit['payable'],
                    (string) ($cat['currency'] ?? $pending['currency']),
                    $hit['sms'],
                    'matched'
                );
                $matched = strtolower((string) ($paid['status'] ?? '')) === 'completed';
            }

            GpJson::send([
                'ok' => true,
                'matched' => $matched,
                'ambiguous' => count($hits) > 1,
            ]);
        }

        GpJson::error('NOT_FOUND', 'Unknown companion route.', 404);
    }

    /** @param array<string,mixed> $stored */
    private static function sameSmsEvidence(array $stored, string $sender, string $amount, string $trxId, string $number, string $receivedAt): bool
    {
        return strtoupper((string) ($stored['trx_id'] ?? '')) === strtoupper($trxId)
            && GpCatalog::publicCode((string) ($stored['sender_key'] ?? '')) === $sender
            && GpMoney::sanitize((string) ($stored['amount'] ?? '0')) === $amount
            && (string) ($stored['received_at'] ?? '') === $receivedAt
            && (preg_replace('/\D+/', '', (string) ($stored['number'] ?? '')) ?: '')
                === (preg_replace('/\D+/', '', $number) ?: '');
    }

    /**
     * @return array<string,mixed>
     */
    public static function authenticateActiveDevice(GpRequest $req): array
    {
        GpRateLimiter::guard('device-ip:' . GpRateLimiter::ip(), 120, 60);
        $token = $req->bearer() ?? ($req->deviceToken() ?? '');
        GpRateLimiter::guard('device-prefix:' . substr((string) $token, 0, 12), 60, 60);
        if (!is_string($token) || $token === '') {
            GpJson::error('UNAUTHORIZED', 'Device API key required (gpdev_…).', 401);
        }
        if (!str_starts_with($token, 'gpdev_')) {
            GpJson::error(
                'UNAUTHORIZED',
                'Use the Device API key from Dashboard → Devices (gpdev_…), not your website key (gp_live_…).',
                401
            );
        }
        $brandHint = trim((string) ($_SERVER['HTTP_X_GRESSPAY_BRAND'] ?? ''));
        $device = self::resolveActiveDevice($brandHint, $token);
        if ($device === null) {
            GpJson::error('UNAUTHORIZED', 'Invalid or revoked device API key.', 401);
        }
        return $device;
    }

    /**
     * Resolve device by token; optional brand hint must match brd_* when provided.
     *
     * @return array<string,mixed>|null
     */
    public static function resolveActiveDevice(string $brandHint, string $token): ?array
    {
        if ($token === '') {
            return null;
        }
        if ($brandHint !== '' && self::looksLikeBrandId($brandHint)) {
            $scoped = self::deviceForSmsToken($brandHint, $token);
            if ($scoped !== null) {
                return $scoped;
            }
        }
        return self::deviceForToken($token);
    }

    public static function looksLikeBrandId(string $value): bool
    {
        return str_starts_with($value, 'brd_');
    }

    /**
     * @param array<string,mixed> $device
     * @return array<string,mixed>
     */
    private static function pairingPayload(array $device): array
    {
        $brandId = (string) ($device['brand_id'] ?? '');
        $brandName = '';
        if ($brandId !== '') {
            $brandRow = GpDb::one('SELECT name FROM gp_brands WHERE brand_id = ?', [$brandId]);
            $brandName = is_array($brandRow) ? (string) ($brandRow['name'] ?? '') : '';
        }
        return [
            'ok' => true,
            'deviceId' => (string) ($device['device_id'] ?? ''),
            'brandId' => $brandId,
            'brandName' => $brandName,
            'apiBaseUrl' => GpPlatform::publicSiteRoot(),
        ];
    }

    /** @param array<string,mixed> $device */
    public static function touchLastSeen(array $device): void
    {
        $now = GpIds::now();
        GpDb::exec(
            'UPDATE gp_devices SET last_seen_at = ?, updated_at = ? WHERE device_id = ? AND brand_id = ? AND status = ?',
            [$now, $now, $device['device_id'], $device['brand_id'], 'active']
        );
    }

    /**
     * Brand-scoped device lookup for SMS uploads (avoids scanning all merchants).
     *
     * @return array<string,mixed>|null
     */
    public static function deviceForSmsToken(string $brandId, string $token): ?array
    {
        if ($brandId === '' || $token === '') {
            return null;
        }
        $devices = GpDb::all(
            'SELECT * FROM gp_devices WHERE brand_id = ? AND token_prefix = ? AND status = ?',
            [$brandId, substr($token, 0, 12), 'active']
        );
        foreach ($devices as $row) {
            if (password_verify($token, $row['token_hash'])) {
                return $row;
            }
        }
        return null;
    }

    /**
     * Token-only lookup (brand chosen when the device was created in the dashboard).
     *
     * @return array<string,mixed>|null
     */
    public static function deviceForToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }
        $devices = GpDb::all(
            "SELECT * FROM gp_devices WHERE token_prefix = ? AND status = 'active'",
            [substr($token, 0, 12)]
        );
        foreach ($devices as $row) {
            if (password_verify($token, (string) ($row['token_hash'] ?? ''))) {
                return $row;
            }
        }
        return null;
    }

    /**
     * When a companion device is bound to a gateway, store that wallet account as SMS number
     * so multi-wallet matching works (APK otherwise uploads shortcodes like 16247).
     *
     * @param array<string,mixed> $device
     */
    private static function resolveSmsWalletNumber(array $device, string $incomingNumber, string $sender = ''): string
    {
        $boundId = trim((string) ($device['bound_gateway_id'] ?? ''));
        if ($boundId !== '') {
            $gw = GpDb::one(
                'SELECT account FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
                [(string) $device['brand_id'], $boundId]
            );
            $account = trim((string) ($gw['account'] ?? ''));
            if ($account !== '') {
                return $account;
            }
        }
        if ($sender !== '') {
            $single = GpDb::all(
                'SELECT account FROM gp_gateways WHERE brand_id = ? AND method_code = ? AND status = ?',
                [(string) $device['brand_id'], $sender, 'active']
            );
            if (count($single) === 1 && !empty($single[0]['account'])) {
                return trim((string) $single[0]['account']);
            }
        }
        return $incomingNumber;
    }

    /** @param array<string,mixed> $actor */
    private static function bindDeviceGateway(array $actor, string $deviceId, GpRequest $req): never
    {
        $dev = GpDb::one(
            'SELECT d.* FROM gp_devices d
             INNER JOIN gp_brands b ON b.brand_id = d.brand_id
             WHERE d.device_id = ? AND b.merchant_id = ?',
            [$deviceId, $actor['merchant_id']]
        );
        if ($dev === null) {
            GpJson::error('NOT_FOUND', 'Device not found.', 404);
        }
        $gatewayId = trim((string) $req->input('gatewayId', $req->input('boundGatewayId', '')));
        if ($gatewayId === '' || strtolower($gatewayId) === 'null' || strtolower($gatewayId) === 'none') {
            GpDb::exec(
                'UPDATE gp_devices SET bound_gateway_id = NULL, updated_at = ? WHERE device_id = ?',
                [GpIds::now(), $deviceId]
            );
            GpJson::send(['ok' => true, 'deviceId' => $deviceId, 'boundGatewayId' => null]);
        }
        // BUG DEV-02: SMS matching requires an active bound gateway.
        $gw = GpDb::one(
            "SELECT gateway_id, account, method_code, display_name, status FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?",
            [(string) $dev['brand_id'], $gatewayId]
        );
        if ($gw === null) {
            GpJson::error('NOT_FOUND', 'Gateway not found for this device brand.', 404);
        }
        if (strtolower((string) ($gw['status'] ?? '')) !== 'active') {
            GpJson::error('GATEWAY_INACTIVE', 'Bind the device to an active gateway only.', 409);
        }
        GpDb::exec(
            'UPDATE gp_devices SET bound_gateway_id = ?, updated_at = ? WHERE device_id = ?',
            [$gatewayId, GpIds::now(), $deviceId]
        );
        GpJson::send([
            'ok' => true,
            'deviceId' => $deviceId,
            'boundGatewayId' => $gatewayId,
            'boundGatewayAccount' => (string) ($gw['account'] ?? ''),
            'boundGatewayMethod' => (string) ($gw['method_code'] ?? ''),
            'boundGatewayName' => (string) ($gw['display_name'] ?? ''),
        ]);
    }

    private static function listDevices(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT d.device_id, d.label, d.status, d.last_seen_at, d.created_at, d.updated_at, d.token_sealed, d.brand_id,
                    d.bound_gateway_id, b.name AS brand_name
             FROM gp_devices d
             INNER JOIN gp_brands b ON b.brand_id = d.brand_id
             WHERE b.merchant_id = ? AND d.status = ?
             ORDER BY d.id DESC',
            [$actor['merchant_id'], 'active']
        );
        $out = [];
        $onlineCutoff = time() - self::ONLINE_WINDOW_SEC;
        foreach ($rows as $r) {
            $lastSeen = $r['last_seen_at'] ?? null;
            $online = false;
            if (is_string($lastSeen) && $lastSeen !== '') {
                $ts = strtotime($lastSeen);
                $online = $ts !== false && $ts >= $onlineCutoff;
            }
            $plain = '';
            if (!empty($r['token_sealed'])) {
                $plain = GpCrypto::open((string) $r['token_sealed']) ?? '';
            }
            $boundGwId = trim((string) ($r['bound_gateway_id'] ?? ''));
            $boundAccount = null;
            $boundMethod = null;
            $boundName = null;
            if ($boundGwId !== '') {
                $gw = GpDb::one(
                    'SELECT account, method_code, display_name FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
                    [(string) $r['brand_id'], $boundGwId]
                );
                if ($gw) {
                    $boundAccount = (string) ($gw['account'] ?? '');
                    $boundMethod = (string) ($gw['method_code'] ?? '');
                    $boundName = (string) ($gw['display_name'] ?? '');
                }
            }
            $out[] = [
                'deviceId' => $r['device_id'],
                'label' => $r['label'] ?? '',
                'brandId' => $r['brand_id'],
                'brandName' => (string) ($r['brand_name'] ?? ''),
                'boundGatewayId' => $boundGwId !== '' ? $boundGwId : null,
                'boundGatewayAccount' => $boundAccount,
                'boundGatewayMethod' => $boundMethod,
                'boundGatewayName' => $boundName,
                'status' => $r['status'],
                'lastSeenAt' => $lastSeen,
                'online' => $online,
                'onlineWindowSec' => self::ONLINE_WINDOW_SEC,
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
                'deviceAppKey' => $plain,
                'deviceAppKeyMasked' => $plain !== '' ? '**********' : '**********',
                'deviceAppKeyCopyable' => $plain !== '',
            ];
        }
        GpJson::send(['devices' => $out]);
    }

    private static function listSmsLogs(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT s.id, s.sender_key, s.amount, s.trx_id, s.number, s.status, s.created_at, s.device_id, d.label AS device_label
             FROM gp_sms_data s
             LEFT JOIN gp_devices d ON d.device_id = s.device_id AND d.brand_id = s.brand_id
             WHERE s.brand_id = ?
             ORDER BY s.id DESC
             LIMIT 100',
            [$actor['brand_id']]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (string) $r['id'],
                'sender_key' => (string) ($r['sender_key'] ?? ''),
                'amount' => (float) ($r['amount'] ?? 0),
                'trx_id' => (string) ($r['trx_id'] ?? ''),
                'number' => ($r['number'] ?? '') !== '' ? (string) $r['number'] : null,
                'status' => (string) ($r['status'] ?? ''),
                'device_label' => ($r['device_label'] ?? '') !== '' ? (string) $r['device_label'] : null,
                'created_at' => (string) ($r['created_at'] ?? ''),
            ];
        }
        GpJson::send(['smsLogs' => $out]);
    }
}
