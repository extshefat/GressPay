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
                    default => GpJson::error('NOT_FOUND', 'Unknown merchant admin action.', 404),
                },
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
            default => GpJson::error('NOT_FOUND', 'Unknown admin route.', 404),
        };
    }

    private static function stats(): never
    {
        $merchantCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_merchants')['c'] ?? 0);
        $activeMerchants = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_merchants WHERE status = 'active'")['c'] ?? 0);
        $txnCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_transactions')['c'] ?? 0);
        $completedTxnCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_transactions WHERE status = 'completed'")['c'] ?? 0);
        
        $volRow = GpDb::one("SELECT COALESCE(SUM(amount), 0) as total FROM gp_transactions WHERE status = 'completed' AND currency = 'BDT'");
        $volBdt = (float) ($volRow['total'] ?? 0);

        $cryptoRow = GpDb::one("SELECT COALESCE(SUM(amount), 0) as total FROM gp_transactions WHERE status = 'completed' AND currency = 'USDT'");
        $volCrypto = (float) ($cryptoRow['total'] ?? 0);

        $plansCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_plans WHERE status = 'active'")['c'] ?? 0);
        $activeSubsCount = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_subscriptions WHERE status = 'active'")['c'] ?? 0);

        GpJson::send([
            'merchants' => [
                'total' => $merchantCount,
                'active' => $activeMerchants,
            ],
            'transactions' => [
                'total' => $txnCount,
                'completed' => $completedTxnCount,
                'volumeBdt' => $volBdt,
                'volumeUsdt' => $volCrypto,
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
                   b.brand_id, b.name as brand_name, b.currency_code
            FROM gp_merchants m
            LEFT JOIN gp_brands b ON b.merchant_id = m.merchant_id
            ORDER BY m.id DESC
            LIMIT 200
        ');

        $out = [];
        foreach ($rows as $r) {
            $mid = (string) $r['merchant_id'];
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
            $txCount = (int) (GpDb::one('SELECT COUNT(*) as c FROM gp_transactions WHERE brand_id = ?', [(string) $r['brand_id']])['c'] ?? 0);

            $out[] = [
                'id' => $mid,
                'name' => $r['full_name'],
                'email' => $r['email'],
                'brandId' => $r['brand_id'],
                'brandName' => $r['brand_name'] ?? 'Merchant Store',
                'authProvider' => $r['auth_provider'] ?? 'local',
                'status' => $r['status'],
                'credits' => $credits,
                'transactionsCount' => $txCount,
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

    private static function adjustCredit(array $actor, string $merchantId, GpRequest $req): never
    {
        $delta = (int) $req->input('delta', 0);
        $reason = trim((string) $req->input('reason', 'Admin adjustment'));
        if ($delta === 0) {
            GpJson::error('VALIDATION', 'Delta amount cannot be zero.');
        }

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        if (!$merchant) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }

        $latestCredit = GpDb::one('SELECT balance_after FROM gp_credit_transactions WHERE merchant_id = ? ORDER BY id DESC LIMIT 1', [$merchantId]);
        $currentBalance = $latestCredit ? (int) $latestCredit['balance_after'] : 0;
        $newBalance = max(0, $currentBalance + $delta);

        $now = GpIds::now();
        GpDb::exec('
            INSERT INTO gp_credit_transactions (merchant_id, delta, balance_after, reason, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ', [$merchantId, $delta, $newBalance, $reason, $actor['email'], $now]);

        // Also update active subscription credits if one exists
        GpDb::exec('
            UPDATE gp_subscriptions SET credits_remaining = ?, updated_at = ?
            WHERE merchant_id = ? AND status = ?
        ', [$newBalance, $now, $merchantId, 'active']);

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
