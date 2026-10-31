<?php
declare(strict_types=1);

final class AdminController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireAdmin($req);
        $action = $req->part(1) ?? '';
        $id = $req->part(2) ?? '';
        $sub = $req->part(3) ?? '';

        match ($action) {
            'stats' => self::stats(),
            'merchants' => match ($req->method) {
                'GET' => self::listMerchants(),
                'POST' => match ($sub) {
                    'credit' => self::adjustCredit($actor, $id, $req),
                    'status' => self::updateMerchantStatus($actor, $id, $req),
                    'role' => self::updateMerchantRole($actor, $id, $req),
                    'plan' => self::updateMerchantPlan($actor, $id, $req),
                    default => GpJson::error('NOT_FOUND', 'Unknown merchant admin action.', 404),
                },
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'transactions' => match ($req->method) {
                'GET' => self::listTransactions($req),
                'POST' => match ($sub) {
                    'resolve' => self::resolveTransaction($actor, $id, $req),
                    default => GpJson::error('NOT_FOUND', 'Unknown transaction admin action.', 404),
                },
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'sms' => match ($req->method) {
                'GET' => self::listSms($req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'plans' => match ($req->method) {
                'GET' => self::listPlans(),
                'POST' => $id !== '' ? self::updatePlan($actor, $id, $req) : self::createPlan($actor, $req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'subscriptions' => match ($req->method) {
                'GET' => self::listSubscriptions(),
                'POST' => self::assignSubscription($actor, $req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'gateways' => match ($req->method) {
                'GET' => self::listPlatformGateways(),
                'POST' => match ($sub) {
                    'toggle' => self::togglePlatformGateway($actor, $id),
                    default => self::updatePlatformGateway($actor, $id, $req),
                },
                'PUT' => self::updatePlatformGateway($actor, $id, $req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'audit' => match ($req->method) {
                'GET' => self::listAuditLogs(),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'devices' => match ($req->method) {
                'GET' => self::listAllDevices(),
                'POST' => $sub === 'revoke' ? self::revokeDevice($actor, $id) : GpJson::error('NOT_FOUND', 'Unknown device action.', 404),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'payment-settings' => match ($req->method) {
                'GET' => self::getPlatformPaymentSettings(),
                'PUT', 'POST' => self::putPlatformPaymentSettings($actor, $req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            'billing-brand' => match ($req->method) {
                'GET' => self::getBillingBrand(),
                'PUT', 'POST' => self::putBillingBrand($actor, $req),
                default => GpJson::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405),
            },
            default => GpJson::error('NOT_FOUND', 'Unknown admin route.', 404),
        };
    }

    private static function stats(): never
    {
        $merchantCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_merchants')['c'] ?? 0);
        $activeMerchants = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_merchants WHERE status = 'active'")['c'] ?? 0);
        $suspendedMerchants = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_merchants WHERE status = 'suspended'")['c'] ?? 0);

        $txnCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_transactions')['c'] ?? 0);
        $completedTxnCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_transactions WHERE status = 'completed'")['c'] ?? 0);
        $pendingTxnCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_transactions WHERE status IN ('pending', 'initiated')")['c'] ?? 0);
        $failedTxnCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_transactions WHERE status IN ('failed', 'expired')")['c'] ?? 0);
        
        $volRow = GpDb::one("SELECT COALESCE(SUM(amount), 0) as total FROM gp_transactions WHERE status = 'completed' AND currency = 'BDT'");
        $volBdt = (float) ($volRow['total'] ?? 0);

        $cryptoRow = GpDb::one("SELECT COALESCE(SUM(amount), 0) as total FROM gp_transactions WHERE status = 'completed' AND currency = 'USDT'");
        $volCrypto = (float) ($cryptoRow['total'] ?? 0);

        // Companion Devices (online if seen in last 10 minutes)
        $tenMinutesAgo = date('Y-m-d H:i:s', time() - 600);
        $totalDevices = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_devices')['c'] ?? 0);
        $onlineDevices = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_devices WHERE status = 'active' AND last_seen_at >= ?", [$tenMinutesAgo])['c'] ?? 0);

        // SMS Ingest
        $totalSms = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_sms_data')['c'] ?? 0);
        $matchedSms = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_sms_data WHERE status = 'used'")['c'] ?? 0);
        $unmatchedSms = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_sms_data WHERE status = 'approved'")['c'] ?? 0);

        // Webhook Deliveries
        $totalWebhooks = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_webhook_deliveries')['c'] ?? 0);
        $deliveredWebhooks = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_webhook_deliveries WHERE status IN ('completed', 'delivered')")['c'] ?? 0);
        $webhookHealth = $totalWebhooks > 0 ? round(($deliveredWebhooks / $totalWebhooks) * 100, 1) : 100.0;

        $plansCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_subscription_plans WHERE status = 'active'")['c'] ?? 0);
        if ($plansCount === 0) {
            $plansCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_plans WHERE status = 'active'")['c'] ?? 0);
        }
        $activeSubsCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_subscriptions WHERE status = 'active'")['c'] ?? 0);

        $enabledGateways = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_platform_gateways WHERE is_enabled = 1")['c'] ?? 0);
        $totalGateways = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_platform_gateways')['c'] ?? 0);

        GpJson::send([
            'merchants' => [
                'total' => $merchantCount,
                'active' => $activeMerchants,
                'suspended' => $suspendedMerchants,
            ],
            'transactions' => [
                'total' => $txnCount,
                'completed' => $completedTxnCount,
                'pending' => $pendingTxnCount,
                'failed' => $failedTxnCount,
                'volumeBdt' => $volBdt,
                'volumeUsdt' => $volCrypto,
            ],
            'devices' => [
                'total' => $totalDevices,
                'online' => $onlineDevices,
            ],
            'sms' => [
                'total' => $totalSms,
                'matched' => $matchedSms,
                'unmatched' => $unmatchedSms,
            ],
            'webhooks' => [
                'total' => $totalWebhooks,
                'delivered' => $deliveredWebhooks,
                'healthPercent' => $webhookHealth,
            ],
            'gateways' => [
                'total' => $totalGateways,
                'enabled' => $enabledGateways,
            ],
            'subscriptions' => [
                'activePlans' => $plansCount,
                'activeSubscriptions' => $activeSubsCount,
            ],
            'system' => [
                'status' => 'operational',
                'adminEmails' => GpConfig::adminEmails(),
                'serverTime' => GpIds::now(),
            ],
        ]);
    }

    private static function listMerchants(): never
    {
        $rows = GpDb::all('
            SELECT m.merchant_id, m.full_name, m.email, m.auth_provider, m.status, m.created_at,
                   m.role, m.plan_id, m.plan_expires_at,
                   b.brand_id, b.name as brand_name, b.currency_code
            FROM gp_merchants m
            LEFT JOIN gp_brands b ON b.merchant_id = m.merchant_id
            ORDER BY m.id DESC
            LIMIT 200
        ');

        $out = [];
        foreach ($rows as $r) {
            $mid = (string) $r['merchant_id'];
            $bid = (string) ($r['brand_id'] ?? '');

            // Fetch subscription and credit balance
            $sub = GpDb::one('
                SELECT s.subscription_id, s.plan_id, s.status as sub_status, s.credits_remaining, s.credits_used, s.starts_at, s.expires_at,
                       p.name as plan_name, p.code as plan_code
                FROM gp_subscriptions s
                LEFT JOIN gp_plans p ON p.plan_id = s.plan_id
                WHERE s.merchant_id = ? AND s.status = ?
                ORDER BY s.id DESC LIMIT 1
            ', [$mid, 'active']);

            // Get credit transaction total
            $creditRow = GpDb::one('
                SELECT balance_after FROM gp_credit_transactions
                WHERE merchant_id = ? ORDER BY id DESC LIMIT 1
            ', [$mid]);
            $credits = $creditRow ? (int) $creditRow['balance_after'] : ($sub ? (int) $sub['credits_remaining'] : 0);

            // Count total transactions
            $txCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_transactions WHERE brand_id = ?', [$bid])['c'] ?? 0);

            // Count connected devices
            $devCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_devices WHERE brand_id = ?', [$bid])['c'] ?? 0);

            // Count active payment methods
            $gwCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_methods WHERE brand_id = ? AND status = 'active'", [$bid])['c'] ?? 0);

            // Total verified volume in BDT
            $volRow = GpDb::one("SELECT COALESCE(SUM(amount), 0) as total FROM gp_transactions WHERE brand_id = ? AND status = 'completed' AND currency = 'BDT'", [$bid]);
            $volBdt = (float) ($volRow['total'] ?? 0);

            $out[] = [
                'id' => $mid,
                'name' => $r['full_name'],
                'email' => $r['email'],
                'role' => $r['role'] ?? 'merchant',
                'planId' => $r['plan_id'] ?? 'starter',
                'planExpiresAt' => $r['plan_expires_at'] ?? null,
                'brandId' => $r['brand_id'],
                'brandName' => $r['brand_name'] ?? 'Merchant Store',
                'authProvider' => $r['auth_provider'] ?? 'local',
                'status' => $r['status'] ?? 'active',
                'credits' => $credits,
                'transactionsCount' => $txCount,
                'totalVolumeBdt' => $volBdt,
                'deviceCount' => $devCount,
                'activeGatewaysCount' => $gwCount,
                'subscription' => $sub ? [
                    'id' => $sub['subscription_id'],
                    'planId' => $sub['plan_id'],
                    'planName' => $sub['plan_name'] ?? 'Standard Plan',
                    'planCode' => $sub['plan_code'] ?? 'starter',
                    'creditsRemaining' => (int) $sub['credits_remaining'],
                    'creditsUsed' => (int) $sub['credits_used'],
                    'startsAt' => $sub['starts_at'],
                    'expiresAt' => $sub['expires_at'],
                ] : null,
                'createdAt' => $r['created_at'],
            ];
        }

        GpJson::send(['merchants' => $out]);
    }

    private static function updateMerchantRole(array $actor, string $merchantId, GpRequest $req): never
    {
        $role = strtolower(trim((string) $req->input('role', 'merchant')));
        if (!in_array($role, ['merchant', 'admin'], true)) {
            GpJson::error('VALIDATION', 'Role must be merchant or admin.');
        }

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        $now = GpIds::now();
        if ($role === 'admin') {
            GpDb::exec('UPDATE gp_merchants SET role = ?, plan_id = ?, updated_at = ? WHERE merchant_id = ?', [$role, 'lifetime', $now, $merchantId]);
        } else {
            GpDb::exec('UPDATE gp_merchants SET role = ?, updated_at = ? WHERE merchant_id = ?', [$role, $now, $merchantId]);
        }

        self::logAudit($actor['email'], 'merchant', $merchantId, 'update_role', [
            'previous' => $merchant['role'] ?? 'merchant',
            'new' => $role,
        ]);

        GpJson::send(['ok' => true, 'merchantId' => $merchantId, 'role' => $role]);
    }

    private static function updateMerchantPlan(array $actor, string $merchantId, GpRequest $req): never
    {
        $planId = strtolower(trim((string) $req->input('plan_id', $req->input('planId', 'starter'))));
        $dbPlans = GpDb::all('SELECT plan_id FROM gp_plans');
        $validPlans = !empty($dbPlans)
            ? array_map(static fn($p) => strtolower((string) $p['plan_id']), $dbPlans)
            : ['starter', 'growth', 'pro', 'enterprise', 'lifetime'];

        if (!in_array($planId, $validPlans, true)) {
            $resolved = GpDb::one(
                'SELECT plan_id FROM gp_plans WHERE LOWER(code) = ? OR LOWER(plan_id) = ? LIMIT 1',
                [$planId, $planId]
            );
            if ($resolved !== null) {
                $planId = strtolower((string) $resolved['plan_id']);
            }
        }

        if (!in_array($planId, $validPlans, true)) {
            GpJson::error('VALIDATION', 'Invalid plan ID. Must be one of: ' . implode(', ', $validPlans));
        }

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        $isLifetime = (bool) $req->input('is_lifetime', $req->input('isLifetime', $planId === 'lifetime'));
        $durationDays = (int) $req->input('duration_days', $req->input('durationDays', 0));
        $expiresAt = null;

        if (!$isLifetime) {
            if ($durationDays > 0) {
                $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + ($durationDays * 86400));
            } else {
                $rawExp = $req->input('plan_expires_at', $req->input('expiresAt', null));
                if ($rawExp !== null && trim((string) $rawExp) !== '') {
                    $expiresAt = trim((string) $rawExp);
                } elseif ($planId !== 'lifetime') {
                    $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + (30 * 86400));
                }
            }
        }

        $planDef = GpDb::one('SELECT * FROM gp_plans WHERE plan_id = ?', [$planId]);
        $creditAllowance = (int) ($planDef['credit_allowance'] ?? 1000);
        $bonusCredits = max(0, (int) $req->input('bonus_credits', $req->input('bonusCredits', 0)));
        $totalCreditsToGrant = $creditAllowance + $bonusCredits;

        $reason = trim((string) $req->input('reason', 'Plan upgrade: ' . strtoupper($planId)));

        $now = GpIds::now();
        GpDb::exec('
            UPDATE gp_merchants
            SET plan_id = ?, plan_expires_at = ?, updated_at = ?
            WHERE merchant_id = ?
        ', [$planId, $expiresAt, $now, $merchantId]);

        // Keep gp_subscriptions in sync as well
        $activeSub = GpDb::one('SELECT * FROM gp_subscriptions WHERE merchant_id = ? AND status = ? ORDER BY id DESC LIMIT 1', [$merchantId, 'active']);
        if ($activeSub) {
            GpDb::exec('
                UPDATE gp_subscriptions
                SET plan_id = ?, credits_remaining = ?, expires_at = ?, updated_at = ?
                WHERE subscription_id = ?
            ', [$planId, $totalCreditsToGrant, $expiresAt, $now, $activeSub['subscription_id']]);
        } else {
            $subId = 'sub_' . bin2hex(random_bytes(8));
            GpDb::exec('
                INSERT INTO gp_subscriptions (subscription_id, merchant_id, plan_id, status, credits_remaining, credits_used, starts_at, expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            ', [$subId, $merchantId, $planId, 'active', $totalCreditsToGrant, $now, $expiresAt, $now, $now]);
        }

        // Record credit transaction history
        GpDb::exec('
            INSERT INTO gp_credit_transactions (merchant_id, delta, balance_after, reason, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ', [$merchantId, $totalCreditsToGrant, $totalCreditsToGrant, $reason, $actor['email'], $now]);

        self::logAudit($actor['email'], 'merchant', $merchantId, 'update_plan', [
            'previous_plan' => $merchant['plan_id'] ?? 'starter',
            'new_plan' => $planId,
            'is_lifetime' => $isLifetime,
            'credits_granted' => $totalCreditsToGrant,
            'expires_at' => $expiresAt,
            'reason' => $reason,
        ]);

        GpJson::send([
            'ok' => true,
            'merchantId' => $merchantId,
            'planId' => $planId,
            'planExpiresAt' => $expiresAt,
            'credits' => $totalCreditsToGrant,
        ]);
    }

    private static function listTransactions(GpRequest $req): never
    {
        $status = strtolower(trim((string) $req->input('status', '')));
        $search = trim((string) $req->input('search', ''));
        $limit = min(100, max(1, (int) $req->input('limit', 50)));

        $where = ['1=1'];
        $params = [];

        if ($status !== '' && $status !== 'all') {
            $where[] = 't.status = ?';
            $params[] = $status;
        }

        if ($search !== '') {
            $where[] = '(t.trx_id LIKE ? OR t.session_id LIKE ? OR t.customer_number LIKE ? OR t.sender_number LIKE ? OR m.email LIKE ? OR b.name LIKE ?)';
            $wildcard = '%' . $search . '%';
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
        }

        $sqlWhere = implode(' AND ', $where);
        $countRow = GpDb::one("
            SELECT COUNT(*) as c
            FROM gp_transactions t
            LEFT JOIN gp_brands b ON b.brand_id = t.brand_id
            LEFT JOIN gp_merchants m ON m.merchant_id = b.merchant_id
            WHERE {$sqlWhere}
        ", $params);
        $total = (int) ($countRow['c'] ?? 0);

        $rows = GpDb::all("
            SELECT t.*, b.name as brand_name, m.merchant_id, m.full_name as merchant_name, m.email as merchant_email
            FROM gp_transactions t
            LEFT JOIN gp_brands b ON b.brand_id = t.brand_id
            LEFT JOIN gp_merchants m ON m.merchant_id = b.merchant_id
            WHERE {$sqlWhere}
            ORDER BY t.id DESC
            LIMIT {$limit}
        ", $params);

        $out = [];
        foreach ($rows as $r) {
            $meta = [];
            if (!empty($r['metadata'])) {
                $decoded = is_array($r['metadata']) ? $r['metadata'] : json_decode((string) $r['metadata'], true);
                $meta = is_array($decoded) ? $decoded : [];
            }
            $out[] = [
                'id' => (string) $r['id'],
                'sessionId' => $r['session_id'],
                'brandId' => $r['brand_id'],
                'brandName' => $r['brand_name'] ?? 'Merchant Store',
                'merchantId' => $r['merchant_id'] ?? '',
                'merchantName' => $r['merchant_name'] ?? 'Merchant',
                'merchantEmail' => $r['merchant_email'] ?? '',
                'amount' => (float) $r['amount'],
                'currency' => $r['currency'],
                'methodCode' => $r['method_code'] ?? '',
                'status' => $r['status'],
                'trxId' => $r['trx_id'] ?? '',
                'customerNumber' => $r['customer_number'] ?? '',
                'senderNumber' => $r['sender_number'] ?? '',
                'verifiedAmount' => $r['verified_amount'] ? (float) $r['verified_amount'] : null,
                'verifiedAt' => $r['verified_at'] ?? null,
                'metadata' => $meta,
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
            ];
        }

        GpJson::send(['transactions' => $out, 'total' => $total]);
    }

    private static function resolveTransaction(array $actor, string $id, GpRequest $req): never
    {
        $tx = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ? OR id = ?', [$id, $id]);
        if (!$tx) {
            GpJson::error('NOT_FOUND', 'Transaction not found.', 404);
        }
        if ($tx['status'] === 'completed') {
            GpJson::error('ALREADY_COMPLETED', 'Transaction is already marked completed.', 400);
        }

        $trxId = trim((string) $req->input('trx_id', $req->input('trxId', $tx['trx_id'] ?? '')));
        if ($trxId === '') {
            $trxId = 'MANUAL_' . strtoupper(bin2hex(random_bytes(4)));
        }

        $methodCode = GpCatalog::publicCode((string) ($tx['method_code'] ?: 'bkash'));
        $cat = GpCatalog::find($methodCode);
        $localCurrency = $cat ? (string) $cat['currency'] : (string) $tx['currency'];
        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$tx['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
        ) ?? ['options' => '{}', 'code' => $methodCode];

        $meta = [];
        if (!empty($tx['metadata'])) {
            $decoded = is_array($tx['metadata']) ? $tx['metadata'] : json_decode((string) $tx['metadata'], true);
            $meta = is_array($decoded) ? $decoded : [];
        }
        $meta['adminResolution'] = [
            'resolvedBy' => $actor['email'],
            'note' => trim((string) $req->input('note', 'Admin manual verification')),
            'at' => GpIds::now(),
        ];
        $tx['metadata'] = json_encode($meta, JSON_UNESCAPED_SLASHES);

        $paid = CheckoutController::markPaid(
            $tx,
            $trxId,
            $methodCode,
            $methodRow,
            (string) $tx['amount'],
            $localCurrency,
            null,
            'admin_resolved',
            [
                'provider_ref' => $trxId,
                'verified_amount' => (string) $tx['amount'],
                'verified_currency' => $localCurrency,
                'meta' => $meta['adminResolution'],
            ]
        );

        self::logAudit($actor['email'], 'transaction', $tx['session_id'], 'admin_resolve_transaction', [
            'session_id' => $tx['session_id'],
            'trx_id' => $trxId,
            'amount' => $tx['amount'],
            'currency' => $tx['currency'],
        ]);

        GpJson::send(['ok' => true, 'transaction' => $paid]);
    }

    private static function listSms(GpRequest $req): never
    {
        $search = trim((string) $req->input('search', ''));
        $status = strtolower(trim((string) $req->input('status', '')));
        $limit = min(100, max(1, (int) $req->input('limit', 50)));

        $where = ['1=1'];
        $params = [];

        if ($status !== '' && $status !== 'all') {
            $where[] = 's.status = ?';
            $params[] = $status;
        }

        if ($search !== '') {
            $where[] = '(s.trx_id LIKE ? OR s.number LIKE ? OR s.sender_key LIKE ? OR d.label LIKE ? OR b.name LIKE ?)';
            $wildcard = '%' . $search . '%';
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
        }

        $sqlWhere = implode(' AND ', $where);
        $rows = GpDb::all("
            SELECT s.*, d.label as device_label, b.name as brand_name
            FROM gp_sms_data s
            LEFT JOIN gp_devices d ON d.device_id = s.device_id
            LEFT JOIN gp_brands b ON b.brand_id = s.brand_id
            WHERE {$sqlWhere}
            ORDER BY s.id DESC
            LIMIT {$limit}
        ", $params);

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (string) $r['id'],
                'brandId' => $r['brand_id'],
                'brandName' => $r['brand_name'] ?? 'Store',
                'deviceId' => $r['device_id'] ?? '',
                'deviceLabel' => $r['device_label'] ?? 'Android Device',
                'senderKey' => $r['sender_key'],
                'amount' => (float) $r['amount'],
                'trxId' => $r['trx_id'],
                'number' => $r['number'] ?? '',
                'status' => $r['status'], // 'approved' (unmatched/ready), 'used' (matched)
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
            ];
        }

        GpJson::send(['smsLogs' => $out, 'total' => count($out)]);
    }

    private static function adjustCredit(array $actor, string $merchantId, GpRequest $req): never
    {
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        $latestCredit = GpDb::one('SELECT balance_after FROM gp_credit_transactions WHERE merchant_id = ? ORDER BY id DESC LIMIT 1', [$merchantId]);
        $currentBalance = $latestCredit ? (int) $latestCredit['balance_after'] : 0;

        $hasSetBalance = $req->input('set_balance', $req->input('setBalance', null)) !== null;
        if ($hasSetBalance) {
            $newBalance = max(0, (int) $req->input('set_balance', $req->input('setBalance', 0)));
            $delta = $newBalance - $currentBalance;
        } else {
            $delta = (int) $req->input('delta', $req->input('amount', 0));
            $newBalance = max(0, $currentBalance + $delta);
        }

        $reason = trim((string) $req->input('reason', 'Admin balance adjustment'));
        if ($delta === 0 && !$hasSetBalance) {
            GpJson::error('VALIDATION', 'Adjustment delta or set_balance is required.');
        }

        $now = GpIds::now();
        GpDb::exec('
            INSERT INTO gp_credit_transactions (merchant_id, delta, balance_after, reason, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ', [$merchantId, $delta, $newBalance, $reason, $actor['email'], $now]);

        // Also update active subscription credits if one exists
        $sub = GpDb::one('SELECT subscription_id FROM gp_subscriptions WHERE merchant_id = ? AND status = ? ORDER BY id DESC LIMIT 1', [$merchantId, 'active']);
        if ($sub) {
            GpDb::exec('
                UPDATE gp_subscriptions SET credits_remaining = ?, updated_at = ?
                WHERE subscription_id = ?
            ', [$newBalance, $now, $sub['subscription_id']]);
        } else {
            $subId = 'sub_' . bin2hex(random_bytes(8));
            GpDb::exec('
                INSERT INTO gp_subscriptions (subscription_id, merchant_id, plan_id, status, credits_remaining, credits_used, starts_at, expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)
            ', [$subId, $merchantId, $merchant['plan_id'] ?? 'starter', 'active', $newBalance, $now, $now, $now]);
        }

        self::logAudit($actor['email'], 'merchant', $merchantId, 'credit_adjustment', [
            'delta' => $delta,
            'balance_after' => $newBalance,
            'reason' => $reason,
        ]);

        GpJson::send([
            'ok' => true,
            'merchantId' => $merchantId,
            'credits' => $newBalance,
            'delta' => $delta,
            'reason' => $reason,
        ]);
    }

    private static function updateMerchantStatus(array $actor, string $merchantId, GpRequest $req): never
    {
        $status = strtolower(trim((string) $req->input('status', 'active')));
        if (!in_array($status, ['active', 'suspended'], true)) {
            GpJson::error('VALIDATION', 'Status must be active or suspended.');
        }

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        GpDb::exec('UPDATE gp_merchants SET status = ?, updated_at = ? WHERE merchant_id = ?', [$status, GpIds::now(), $merchantId]);

        self::logAudit($actor['email'], 'merchant', $merchantId, 'status_change', [
            'previous' => $merchant['status'],
            'new' => $status,
        ]);

        GpJson::send(['ok' => true, 'merchantId' => $merchantId, 'status' => $status]);
    }

    private static function listPlans(): never
    {
        $rows = GpDb::all('SELECT * FROM gp_plans ORDER BY is_free DESC, price_bdt ASC, id ASC');
        $out = [];
        foreach ($rows as $r) {
            $features = json_decode((string) ($r['features_json'] ?? '[]'), true);
            $out[] = [
                'id' => $r['plan_id'],
                'name' => $r['name'],
                'code' => $r['code'],
                'description' => $r['description'] ?? '',
                'priceBdt' => (float) $r['price_bdt'],
                'billingCycle' => $r['billing_cycle'],
                'creditAllowance' => (int) $r['credit_allowance'],
                'features' => is_array($features) ? $features : [],
                'isFree' => (bool) $r['is_free'],
                'status' => $r['status'],
                'createdAt' => $r['created_at'],
                'updatedAt' => $r['updated_at'],
            ];
        }
        GpJson::send(['plans' => $out]);
    }

    private static function createPlan(array $actor, GpRequest $req): never
    {
        $name = trim((string) $req->input('name', ''));
        $code = strtolower(trim((string) $req->input('code', '')));
        $price = (float) $req->input('priceBdt', $req->input('price_bdt', 0));
        $credits = (int) $req->input('creditAllowance', $req->input('credit_allowance', 100));
        $desc = trim((string) $req->input('description', ''));
        $cycle = (string) $req->input('billingCycle', 'monthly');
        $isFree = (bool) $req->input('isFree', $price == 0);
        $features = $req->input('features', []);

        if ($name === '' || $code === '') {
            GpJson::error('VALIDATION', 'Name and code are required.');
        }

        $existing = GpDb::one('SELECT id FROM gp_plans WHERE code = ?', [$code]);
        if ($existing) {
            GpJson::error('DUPLICATE_CODE', 'A plan with this code already exists.', 409);
        }

        $planId = 'plan_' . bin2hex(random_bytes(6));
        $now = GpIds::now();
        GpDb::exec('
            INSERT INTO gp_plans (plan_id, name, code, description, price_bdt, billing_cycle, credit_allowance, features_json, is_free, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ', [
            $planId,
            $name,
            $code,
            $desc,
            $price,
            $cycle,
            $credits,
            json_encode(is_array($features) ? $features : [], JSON_UNESCAPED_SLASHES),
            $isFree ? 1 : 0,
            'active',
            $now,
            $now,
        ]);

        self::logAudit($actor['email'], 'plan', $planId, 'create_plan', [
            'name' => $name,
            'code' => $code,
            'price_bdt' => $price,
            'credits' => $credits,
        ]);

        GpJson::send([
            'ok' => true,
            'planId' => $planId,
            'name' => $name,
            'code' => $code,
        ], 201);
    }

    private static function updatePlan(array $actor, string $planId, GpRequest $req): never
    {
        $plan = GpDb::one('SELECT * FROM gp_plans WHERE plan_id = ?', [$planId]);
        if (!$plan) {
            GpJson::error('NOT_FOUND', 'Plan not found.', 404);
        }

        $name = trim((string) $req->input('name', $plan['name']));
        $price = (float) $req->input('priceBdt', $req->input('price_bdt', $plan['price_bdt']));
        $credits = (int) $req->input('creditAllowance', $req->input('credit_allowance', $plan['credit_allowance']));
        $desc = trim((string) $req->input('description', $plan['description'] ?? ''));
        $status = (string) $req->input('status', $plan['status']);
        $isFree = $req->input('isFree', null) !== null ? ($req->input('isFree') ? 1 : 0) : (int) $plan['is_free'];
        $features = $req->input('features', null);
        $featuresJson = $features !== null ? json_encode($features, JSON_UNESCAPED_SLASHES) : $plan['features_json'];

        if (!in_array($status, ['active', 'archived', 'disabled'], true)) {
            GpJson::error('VALIDATION', 'Invalid status. Must be active, archived, or disabled.');
        }

        $now = GpIds::now();
        GpDb::exec('
            UPDATE gp_plans
            SET name = ?, description = ?, price_bdt = ?, credit_allowance = ?, features_json = ?, is_free = ?, status = ?, updated_at = ?
            WHERE plan_id = ?
        ', [$name, $desc, $price, $credits, $featuresJson, $isFree, $status, $now, $planId]);

        self::logAudit($actor['email'], 'plan', $planId, 'update_plan', [
            'name' => $name,
            'status' => $status,
            'price_bdt' => $price,
            'credits' => $credits,
        ]);

        GpJson::send(['ok' => true, 'planId' => $planId, 'status' => $status]);
    }

    private static function listSubscriptions(): never
    {
        $rows = GpDb::all('
            SELECT s.*, m.full_name as merchant_name, m.email as merchant_email, p.name as plan_name, p.code as plan_code
            FROM gp_subscriptions s
            LEFT JOIN gp_merchants m ON m.merchant_id = s.merchant_id
            LEFT JOIN gp_plans p ON p.plan_id = s.plan_id
            ORDER BY s.id DESC
            LIMIT 200
        ');

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => $r['subscription_id'],
                'merchantId' => $r['merchant_id'],
                'merchantName' => $r['merchant_name'],
                'merchantEmail' => $r['merchant_email'],
                'planId' => $r['plan_id'],
                'planName' => $r['plan_name'] ?? 'Plan',
                'planCode' => $r['plan_code'] ?? '',
                'status' => $r['status'],
                'creditsRemaining' => (int) $r['credits_remaining'],
                'creditsUsed' => (int) $r['credits_used'],
                'startsAt' => $r['starts_at'],
                'expiresAt' => $r['expires_at'],
                'createdAt' => $r['created_at'],
            ];
        }

        GpJson::send(['subscriptions' => $out]);
    }

    private static function assignSubscription(array $actor, GpRequest $req): never
    {
        $merchantId = trim((string) $req->input('merchantId', $req->input('merchant_id', '')));
        $planId = trim((string) $req->input('planId', $req->input('plan_id', '')));
        if ($merchantId === '' || $planId === '') {
            GpJson::error('VALIDATION', 'merchantId and planId are required.');
        }

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        $plan = GpDb::one('SELECT * FROM gp_plans WHERE plan_id = ? AND status = ?', [$planId, 'active']);
        if (!$plan) {
            GpJson::error('NOT_FOUND', 'Active plan not found.', 404);
        }

        $now = GpIds::now();
        $subId = 'sub_' . bin2hex(random_bytes(8));
        $credits = (int) $plan['credit_allowance'];

        // Archive previous active subscriptions without deleting history
        GpDb::exec('
            UPDATE gp_subscriptions SET status = ?, updated_at = ?
            WHERE merchant_id = ? AND status = ?
        ', ['archived', $now, $merchantId, 'active']);

        // Insert new subscription
        GpDb::exec('
            INSERT INTO gp_subscriptions (subscription_id, merchant_id, plan_id, status, credits_remaining, credits_used, starts_at, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)
        ', [$subId, $merchantId, $planId, 'active', $credits, $now, $now, $now]);

        // Record credit transaction
        GpDb::exec('
            INSERT INTO gp_credit_transactions (merchant_id, delta, balance_after, reason, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ', [$merchantId, $credits, $credits, 'Plan assignment: ' . $plan['name'], $actor['email'], $now]);

        // Keep gp_merchants plan in sync
        GpDb::exec('UPDATE gp_merchants SET plan_id = ?, updated_at = ? WHERE merchant_id = ?', [$planId, $now, $merchantId]);

        self::logAudit($actor['email'], 'subscription', $subId, 'assign_plan', [
            'merchant_id' => $merchantId,
            'plan_id' => $planId,
            'plan_name' => $plan['name'],
            'credit_allowance' => $credits,
        ]);

        GpJson::send([
            'ok' => true,
            'subscriptionId' => $subId,
            'merchantId' => $merchantId,
            'planId' => $planId,
            'credits' => $credits,
        ]);
    }

    private static function listAuditLogs(): never
    {
        $rows = GpDb::all('
            SELECT id, actor_email, target_type, target_id, action, details_json, created_at
            FROM gp_admin_audit_logs
            ORDER BY id DESC
            LIMIT 200
        ');

        $out = [];
        foreach ($rows as $r) {
            $details = json_decode((string) ($r['details_json'] ?? '{}'), true);
            $out[] = [
                'id' => (string) $r['id'],
                'actorEmail' => $r['actor_email'],
                'targetType' => $r['target_type'],
                'targetId' => $r['target_id'],
                'action' => $r['action'],
                'details' => is_array($details) ? $details : [],
                'createdAt' => $r['created_at'],
            ];
        }

        GpJson::send(['auditLogs' => $out]);
    }

    private static function listPlatformGateways(): never
    {
        $rows = GpDb::all('SELECT * FROM gp_platform_gateways ORDER BY display_order ASC, id ASC');
        GpJson::send(['gateways' => $rows]);
    }

    private static function togglePlatformGateway(array $actor, string $codeOrId): never
    {
        $gw = GpDb::one('SELECT * FROM gp_platform_gateways WHERE gateway_code = ? OR id = ?', [$codeOrId, $codeOrId]);
        if (!$gw) {
            GpJson::error('NOT_FOUND', 'Platform gateway not found.', 404);
        }
        $newStatus = ((int) $gw['is_enabled']) === 1 ? 0 : 1;
        GpDb::exec('UPDATE gp_platform_gateways SET is_enabled = ?, updated_at = ? WHERE id = ?', [
            $newStatus,
            GpIds::now(),
            $gw['id'],
        ]);
        self::logAudit(
            $actor['email'],
            'platform_gateway',
            $gw['gateway_code'],
            $newStatus === 1 ? 'enable_platform_gateway' : 'disable_platform_gateway',
            ['gateway' => $gw['gateway_code'], 'is_enabled' => $newStatus]
        );
        GpJson::send(['ok' => true, 'gateway_code' => $gw['gateway_code'], 'is_enabled' => $newStatus]);
    }

    private static function updatePlatformGateway(array $actor, string $codeOrId, GpRequest $req): never
    {
        $gw = GpDb::one('SELECT * FROM gp_platform_gateways WHERE gateway_code = ? OR id = ?', [$codeOrId, $codeOrId]);
        if (!$gw) {
            GpJson::error('NOT_FOUND', 'Platform gateway not found.', 404);
        }
        $displayName = (string) $req->input('display_name', $gw['display_name']);
        $instructions = (string) $req->input('instructions', $gw['instructions'] ?? '');
        $minAmount = (float) $req->input('min_amount', $gw['min_amount']);
        $maxAmount = (float) $req->input('max_amount', $gw['max_amount']);
        $displayOrder = (int) $req->input('display_order', $gw['display_order']);
        $isEnabled = $req->input('is_enabled', null);
        $enabledVal = $isEnabled !== null ? ($isEnabled ? 1 : 0) : (int) $gw['is_enabled'];

        GpDb::exec(
            'UPDATE gp_platform_gateways SET display_name = ?, instructions = ?, min_amount = ?, max_amount = ?, display_order = ?, is_enabled = ?, updated_at = ? WHERE id = ?',
            [$displayName, $instructions, $minAmount, $maxAmount, $displayOrder, $enabledVal, GpIds::now(), $gw['id']]
        );

        self::logAudit(
            $actor['email'],
            'platform_gateway',
            $gw['gateway_code'],
            'update_platform_gateway',
            ['gateway' => $gw['gateway_code'], 'is_enabled' => $enabledVal, 'min' => $minAmount, 'max' => $maxAmount]
        );

        GpJson::send(['ok' => true, 'gateway' => array_merge($gw, [
            'display_name' => $displayName,
            'instructions' => $instructions,
            'min_amount' => $minAmount,
            'max_amount' => $maxAmount,
            'display_order' => $displayOrder,
            'is_enabled' => $enabledVal,
        ])]);
    }

    private static function listAllDevices(): never
    {
        $rows = GpDb::all(
            'SELECT device_id, brand_id, label, status, last_seen_at, created_at
             FROM gp_devices ORDER BY id DESC LIMIT 100'
        );
        GpJson::send(['devices' => $rows]);
    }

    private static function getPlatformPaymentSettings(): never
    {
        $row = GpDb::one('SELECT setting_value FROM gp_platform_settings WHERE setting_key = ?', ['admin_payment_wallets']);
        $wallets = [];
        if (is_array($row) && !empty($row['setting_value'])) {
            $decoded = json_decode((string) $row['setting_value'], true);
            if (is_array($decoded)) {
                $wallets = $decoded;
            }
        }
        GpJson::send([
            'wallets' => array_merge([
                'bkash' => '',
                'nagad' => '',
                'rocket' => '',
                'upay' => '',
                'usdt_trc20' => '',
                'binance_uid' => '',
                'bybit_uid' => '',
            ], $wallets),
        ]);
    }

    private static function putPlatformPaymentSettings(array $actor, GpRequest $req): never
    {
        $incoming = $req->input('wallets', $req->body);
        if (!is_array($incoming)) {
            GpJson::error('INVALID_BODY', 'Expected wallets object.', 400);
        }
        if (isset($incoming['wallets']) && is_array($incoming['wallets'])) {
            $incoming = $incoming['wallets'];
        }
        $clean = [
            'bkash' => trim((string) ($incoming['bkash'] ?? '')),
            'nagad' => trim((string) ($incoming['nagad'] ?? '')),
            'rocket' => trim((string) ($incoming['rocket'] ?? '')),
            'upay' => trim((string) ($incoming['upay'] ?? '')),
            'usdt_trc20' => trim((string) ($incoming['usdt_trc20'] ?? '')),
            'binance_uid' => trim((string) ($incoming['binance_uid'] ?? '')),
            'bybit_uid' => trim((string) ($incoming['bybit_uid'] ?? '')),
        ];
        $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
        $now = GpIds::now();
        $existing = GpDb::one('SELECT setting_key FROM gp_platform_settings WHERE setting_key = ?', ['admin_payment_wallets']);
        if (is_array($existing)) {
            GpDb::exec(
                'UPDATE gp_platform_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?',
                [$json, $now, 'admin_payment_wallets']
            );
        } else {
            GpDb::exec(
                'INSERT INTO gp_platform_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)',
                ['admin_payment_wallets', $json, $now]
            );
        }
        self::logAudit((string) ($actor['email'] ?? ''), 'platform_settings', 'admin_payment_wallets', 'update_payment_wallets', [
            'keys' => array_keys(array_filter($clean)),
        ]);
        GpJson::send(['ok' => true, 'wallets' => $clean]);
    }

    private static function getBillingBrand(): never
    {
        $brandId = GpPlatformBilling::billingBrandId();
        $brand = $brandId ? GpDb::one('SELECT brand_id, name FROM gp_brands WHERE brand_id = ?', [$brandId]) : null;
        GpJson::send([
            'billingBrandId' => $brandId,
            'billingBrandName' => $brand['name'] ?? null,
            'note' => 'Configure gateways on this brand for account plan checkout (My Payments).',
        ]);
    }

    /** @param array{email?:string} $actor */
    private static function putBillingBrand(array $actor, GpRequest $req): never
    {
        $brandId = trim((string) $req->input('billingBrandId', $req->input('brandId', '')));
        GpPlatformBilling::setBillingBrandId($brandId);
        self::logAudit((string) ($actor['email'] ?? ''), 'platform_settings', GpPlatformBilling::SETTING_BILLING_BRAND, 'set_billing_brand', [
            'brandId' => $brandId,
        ]);
        GpJson::send(['ok' => true, 'billingBrandId' => $brandId]);
    }

    /** @param array{email?:string} $actor */
    private static function revokeDevice(array $actor, string $deviceId): never
    {
        $row = GpDb::one('SELECT * FROM gp_devices WHERE device_id = ?', [$deviceId]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Device not found.', 404);
        }
        GpDb::exec('UPDATE gp_devices SET status = ?, updated_at = ? WHERE device_id = ?', ['revoked', GpIds::now(), $deviceId]);
        self::logAudit((string) ($actor['email'] ?? ''), 'device', $deviceId, 'revoke', [
            'brandId' => $row['brand_id'] ?? '',
        ]);
        GpJson::send(['ok' => true, 'deviceId' => $deviceId, 'status' => 'revoked']);
    }

    private static function logAudit(string $actorEmail, string $targetType, string $targetId, string $action, array $details): void
    {
        try {
            $ip = GpRateLimiter::ip();
            GpDb::exec('
                INSERT INTO gp_admin_audit_logs (actor_email, target_type, target_id, action, details_json, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ', [
                $actorEmail,
                $targetType,
                $targetId,
                $action,
                json_encode($details, JSON_UNESCAPED_SLASHES),
                $ip,
                GpIds::now(),
            ]);
        } catch (Throwable $e) {
            error_log('[AdminAuditLog] failed to write: ' . $e->getMessage());
        }
    }
}
