<?php
declare(strict_types=1);

final class CompanionController
{
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
            $now = GpIds::now();
            $deviceId = GpIds::make('dev', 8);
            $plain = 'gpdev_' . bin2hex(random_bytes(20));
            $label = trim((string) $req->input('label', 'Android companion'));
            GpDb::exec(
                'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$deviceId, $actor['brand_id'], $label, password_hash($plain, PASSWORD_BCRYPT), 'active', $now, $now]
            );
            GpJson::send([
                'deviceId' => $deviceId,
                'token' => $plain,
                'note' => 'Shown once. Store in the Android companion encrypted prefs. Token is never returned again.',
            ], 201);
        }

        if ($req->method === 'POST' && $action === 'devices' && $devicePart !== null && $req->part(3) === 'revoke') {
            $actor = GpAuth::requireActor($req);
            GpAuth::requireScope($actor, 'manage_devices');
            $n = GpDb::exec(
                'UPDATE gp_devices SET status = ?, updated_at = ? WHERE device_id = ? AND brand_id = ?',
                ['revoked', GpIds::now(), $devicePart, $actor['brand_id']]
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
                'SELECT * FROM gp_devices WHERE device_id = ? AND brand_id = ?',
                [$devicePart, $actor['brand_id']]
            );
            if ($dev === null) {
                GpJson::error('NOT_FOUND', 'Device not found.', 404);
            }
            $plain = 'gpdev_' . bin2hex(random_bytes(20));
            GpDb::exec(
                'UPDATE gp_devices SET token_hash = ?, status = ?, updated_at = ? WHERE device_id = ?',
                [password_hash($plain, PASSWORD_BCRYPT), 'active', GpIds::now(), $devicePart]
            );
            GpJson::send([
                'deviceId' => $devicePart,
                'token' => $plain,
                'note' => 'Shown once. Previous token is invalid.',
            ]);
        }

        if ($req->method === 'POST' && $action === 'sms') {
            GpRateLimiter::guard('sms:' . GpRateLimiter::ip(), 120, 60);
            $token = $req->bearer() ?? ($_SERVER['HTTP_X_GRESSPAY_DEVICE'] ?? $_SERVER['HTTP_X_DEVICE_TOKEN'] ?? '');
            if (!is_string($token) || $token === '') {
                GpJson::error('UNAUTHORIZED', 'Device token required.', 401);
            }

            // Prefer brand-scoped lookup via optional header; still verify hash.
            $brandHint = (string) ($_SERVER['HTTP_X_GRESSPAY_BRAND'] ?? '');
            $devices = $brandHint !== ''
                ? GpDb::all('SELECT * FROM gp_devices WHERE brand_id = ? AND status = ?', [$brandHint, 'active'])
                : GpDb::all('SELECT * FROM gp_devices WHERE status = ?', ['active']);

            $device = null;
            foreach ($devices as $row) {
                if (password_verify($token, $row['token_hash'])) {
                    $device = $row;
                    break;
                }
            }
            if ($device === null) {
                GpJson::error('UNAUTHORIZED', 'Invalid or revoked device token.', 401);
            }

            GpDb::exec(
                'UPDATE gp_devices SET last_seen_at = ?, updated_at = ? WHERE device_id = ?',
                [GpIds::now(), GpIds::now(), $device['device_id']]
            );

            $sender = GpCatalog::publicCode((string) $req->input('sender_key', $req->input('senderKey', 'bkash')));
            if (!in_array($sender, ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'], true)) {
                GpJson::error('UNSUPPORTED_RAIL', 'Companion SMS matching supports bKash and Nagad only in this release.');
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

            $used = GpDb::one(
                'SELECT id FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ?',
                [$device['brand_id'], $trxId, 'used']
            );
            if ($used) {
                GpJson::error('DUPLICATE_SMS', 'This SMS transaction ID was already matched.');
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
                'SELECT * FROM gp_transactions WHERE brand_id = ? AND (trx_id = ? OR UPPER(trx_id) = ?) AND status IN (?, ?) ORDER BY id DESC',
                [$device['brand_id'], $trxId, strtoupper($trxId), 'pending', 'initiated']
            );
            $matched = false;
            if ($pending) {
                $methodCode = GpCatalog::publicCode((string) ($pending['method_code'] ?: $sender));
                if ($methodCode !== $sender) {
                    GpJson::send(['ok' => true, 'matched' => false, 'reason' => 'method_mismatch']);
                }
                $cat = GpCatalog::find($methodCode);
                $payable = $cat
                    ? GpRatesEngine::convert(
                        $pending['brand_id'],
                        (string) $pending['amount'],
                        (string) $pending['currency'],
                        (string) $cat['currency']
                    )
                    : (string) $pending['amount'];
                $sms = CheckoutController::matchingSms($pending['brand_id'], $trxId, $payable, $methodCode);
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

            GpJson::send(['ok' => true, 'matched' => $matched]);
        }

        GpJson::error('NOT_FOUND', 'Unknown companion route.', 404);
    }

    private static function listDevices(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT device_id, label, status, last_seen_at, created_at, updated_at FROM gp_devices WHERE brand_id = ? ORDER BY id DESC',
            [$actor['brand_id']]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'deviceId' => $r['device_id'],
                'label' => $r['label'] ?? '',
                'status' => $r['status'],
                'lastSeenAt' => $r['last_seen_at'],
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
            ];
        }
        GpJson::send(['devices' => $out]);
    }
}
