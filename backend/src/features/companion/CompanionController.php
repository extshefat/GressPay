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
            self::listDevices($actor);
        }

        if ($req->method === 'POST' && $action === 'register') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            $brandId = trim((string) $req->input('brandId', $actor['brand_id']));
            if ($brandId === '') {
                $brandId = GpAuth::requireBrandContext($actor, 'Create a brand under Dashboard → Brands before registering a device.');
            }
            $brand = GpDb::one(
                'SELECT brand_id, name FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$brandId, $actor['merchant_id']]
            );
            if ($brand === null) {
                GpJson::error('NOT_FOUND', 'Brand not found for your account.', 404);
            }
            GpPlatform::assertDeviceRegistrationAllowed($brandId);
            $now = GpIds::now();
            $deviceId = GpIds::make('dev', 8);
            $plain = 'gpdev_' . bin2hex(random_bytes(20));
            $label = trim((string) $req->input('label', 'Android companion'));
            GpDb::exec(
                'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, token_sealed, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $deviceId,
                    $brandId,
                    $label,
                    password_hash($plain, PASSWORD_BCRYPT),
                    GpCrypto::seal($plain),
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
            $n = GpDb::exec(
                'UPDATE gp_devices d
                 INNER JOIN gp_brands b ON b.brand_id = d.brand_id
                 SET d.status = ?, d.updated_at = ?
                 WHERE d.device_id = ? AND b.merchant_id = ?',
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
                'UPDATE gp_devices SET token_hash = ?, token_sealed = ?, status = ?, updated_at = ? WHERE device_id = ?',
                [password_hash($plain, PASSWORD_BCRYPT), GpCrypto::seal($plain), 'active', GpIds::now(), $devicePart]
            );
            GpJson::send([
                'deviceId' => $devicePart,
                'token' => $plain,
                'deviceAppKey' => $plain,
                'note' => 'Device API key rotated. Copy anytime from the Devices table.',
            ]);
        }

        if ($req->method === 'GET' && $action === 'sms-logs') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
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

            $sender = GpCatalog::publicCode((string) $req->input('sender_key', $req->input('senderKey', 'bkash')));
            if (!in_array($sender, ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'], true)) {
                GpJson::error('UNSUPPORTED_RAIL', 'Companion SMS matching supports bKash, Nagad, Rocket, Upay, and Cellfin.');
            }

            $idem = trim((string) $req->input('idempotency_key', $req->input('idempotencyKey', '')));
            if ($idem !== '') {
                $prior = GpDb::one(
                    'SELECT id FROM gp_sms_data WHERE brand_id = ? AND idempotency_key = ?',
                    [$device['brand_id'], $idem]
                );
                if ($prior) {
                    GpJson::send(['ok' => true, 'matched' => false, 'idempotent' => true]);
                }
            }

            $plugin = GpCatalog::loadPlugin($sender);
            $trxId = trim((string) $req->input('trx_id', $req->input('trxId', '')));
            if ($plugin) {
                $trxId = $plugin->normalizeTrx($trxId);
            }
            $amount = GpMoney::sanitize((string) $req->input('amount', '0'));
            if ($trxId === '' || (float) $amount <= 0) {
                GpJson::error('VALIDATION', 'trx_id and amount are required.');
            }

            // Anti-Fraud: Strict uniqueness check against completed orders and used SMS
            $alreadyCompleted = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE (trx_id = ? OR UPPER(trx_id) = ? OR LOWER(trx_id) = ?) AND status = ?',
                [$trxId, strtoupper($trxId), strtolower($trxId), 'completed']
            );
            if ($alreadyCompleted) {
                GpJson::error('DUPLICATE_TRX', 'This Transaction ID has already been used.', 409);
            }

            $used = GpDb::one(
                'SELECT id FROM gp_sms_data WHERE (trx_id = ? OR UPPER(trx_id) = ? OR LOWER(trx_id) = ?) AND status = ?',
                [$trxId, strtoupper($trxId), strtolower($trxId), 'used']
            );
            if ($used) {
                GpJson::error('DUPLICATE_SMS', 'This Transaction ID has already been used.', 409);
            }

            $existingApproved = GpDb::one(
                'SELECT id FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ?',
                [$device['brand_id'], $trxId, 'approved']
            );
            $now = GpIds::now();
            // Audit: store amount/trx/sender/device — never full SMS body.
            if ($existingApproved) {
                GpDb::exec(
                    'UPDATE gp_sms_data SET sender_key = ?, amount = ?, number = ?, device_id = ?, idempotency_key = COALESCE(?, idempotency_key), updated_at = ? WHERE id = ?',
                    [
                        $sender,
                        $amount,
                        (string) $req->input('number', ''),
                        $device['device_id'],
                        $idem !== '' ? $idem : null,
                        $now,
                        $existingApproved['id'],
                    ]
                );
            } else {
                try {
                    GpDb::exec(
                        'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, number, status, device_id, idempotency_key, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            $device['brand_id'],
                            $sender,
                            $amount,
                            $trxId,
                            (string) $req->input('number', ''),
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

            $pending = GpDb::one(
                'SELECT * FROM gp_transactions WHERE brand_id = ? AND (trx_id = ? OR UPPER(trx_id) = ? OR LOWER(trx_id) = ?) AND status IN (?, ?) ORDER BY id DESC',
                [$device['brand_id'], $trxId, strtoupper($trxId), strtolower($trxId), 'pending', 'initiated']
            );
            $matched = false;
            if ($pending) {
                $methodCode = GpCatalog::publicCode((string) ($pending['method_code'] ?: $sender));
                if ($methodCode === $sender) {
                    $cat = GpCatalog::find($methodCode);
                    $payable = $cat
                        ? GpRatesEngine::convert(
                            $pending['brand_id'],
                            (string) $pending['amount'],
                            (string) $pending['currency'],
                            (string) $cat['currency']
                        )
                        : (string) $pending['amount'];
                    $sms = CheckoutController::matchingSms(
                        $pending['brand_id'],
                        $trxId,
                        $payable,
                        $methodCode,
                        isset($pending['gateway_id']) ? (string) $pending['gateway_id'] : null
                    );
                    if ($sms) {
                        $methodRow = GpDb::one(
                            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
                            [$pending['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
                        ) ?? ['options' => '{}', 'code' => $methodCode];
                        $paid = CheckoutController::markPaid(
                            $pending,
                            $trxId,
                            $methodCode,
                            $methodRow,
                            $payable,
                            (string) ($cat['currency'] ?? $pending['currency']),
                            $sms,
                            'matched'
                        );
                        $matched = strtolower((string) ($paid['status'] ?? '')) === 'completed';
                    }
                }
            }

            GpJson::send(['ok' => true, 'matched' => $matched]);
        }

        GpJson::error('NOT_FOUND', 'Unknown companion route.', 404);
    }

    /**
     * @return array<string,mixed>
     */
    public static function authenticateActiveDevice(GpRequest $req): array
    {
        $token = $req->bearer() ?? ($req->deviceToken() ?? '');
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
            'SELECT * FROM gp_devices WHERE brand_id = ? AND status = ?',
            [$brandId, 'active']
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
            "SELECT * FROM gp_devices WHERE status = 'active' ORDER BY id DESC LIMIT 500"
        );
        foreach ($devices as $row) {
            if (password_verify($token, (string) ($row['token_hash'] ?? ''))) {
                return $row;
            }
        }
        return null;
    }

    private static function listDevices(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT d.device_id, d.label, d.status, d.last_seen_at, d.created_at, d.updated_at, d.token_sealed, d.brand_id,
                    b.name AS brand_name
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
            $out[] = [
                'deviceId' => $r['device_id'],
                'label' => $r['label'] ?? '',
                'brandId' => $r['brand_id'],
                'brandName' => (string) ($r['brand_name'] ?? ''),
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
