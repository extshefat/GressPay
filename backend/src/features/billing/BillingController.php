<?php
declare(strict_types=1);

final class BillingController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $merchantId = trim((string) ($actor['merchant_id'] ?? ''));
        if ($merchantId === '') {
            GpJson::error('UNAUTHORIZED', 'Account context required.', 401);
        }

        $action = $req->part(1) ?? '';
        $sub = $req->part(2) ?? '';

        if ($req->method === 'GET' && $action === 'payments') {
            self::listPayments($merchantId);
        }
        if ($req->method === 'GET' && $action === 'plans') {
            self::listPurchasablePlans();
        }
        if ($req->method === 'POST' && $action === 'orders' && $sub === '' ) {
            self::createOrder($actor, $merchantId, $req);
        }
        if ($req->method === 'GET' && $action === 'orders' && $sub !== '') {
            self::resumeOrder($merchantId, $sub);
        }

        GpJson::error('NOT_FOUND', 'Unknown billing route.', 404);
    }

    private static function listPurchasablePlans(): never
    {
        $rows = GpDb::all(
            "SELECT plan_id, name, code, description, price_bdt, billing_cycle, is_free
             FROM gp_plans WHERE status = 'active' AND is_free = 0 ORDER BY price_bdt ASC"
        );
        $plans = array_map(static function (array $r): array {
            return [
                'planId' => (string) $r['plan_id'],
                'code' => (string) $r['code'],
                'name' => (string) $r['name'],
                'description' => (string) ($r['description'] ?? ''),
                'priceBdt' => (string) ($r['price_bdt'] ?? '0'),
                'billingCycle' => (string) ($r['billing_cycle'] ?? 'monthly'),
            ];
        }, $rows);
        GpJson::send(['plans' => $plans, 'billingBrandConfigured' => GpPlatformBilling::billingBrandId() !== null]);
    }

    private static function listPayments(string $merchantId): never
    {
        $rows = GpDb::all(
            'SELECT * FROM gp_account_plan_orders WHERE merchant_id = ? ORDER BY id DESC LIMIT 100',
            [$merchantId]
        );
        GpJson::send([
            'payments' => array_map(static fn ($r) => GpPlatformBilling::presentOrder($r), $rows),
        ]);
    }

    /** @param array{merchant_id?:string,brand_id:string,email?:string} $actor */
    private static function createOrder(array $actor, string $merchantId, GpRequest $req): never
    {
        GpRateLimiter::guard('billing-order:' . $merchantId, 20, 60);
        $planCode = strtolower(trim((string) $req->input('planCode', $req->input('plan_code', ''))));
        if ($planCode === '') {
            GpJson::error('MISSING_PLAN', 'planCode is required.', 400);
        }
        $plan = GpDb::one(
            "SELECT * FROM gp_plans WHERE LOWER(code) = ? AND status = 'active' LIMIT 1",
            [$planCode]
        );
        if ($plan === null) {
            GpJson::error('UNKNOWN_PLAN', 'Plan not found or inactive.', 404);
        }
        if ((int) ($plan['is_free'] ?? 0) === 1 || (float) ($plan['price_bdt'] ?? 0) <= 0) {
            GpJson::error('FREE_PLAN', 'This plan does not require payment.', 400);
        }

        $billingBrandId = GpPlatformBilling::billingBrandId();
        if ($billingBrandId === null) {
            GpJson::error(
                'BILLING_NOT_CONFIGURED',
                'Platform billing is not configured yet. Contact support.',
                503
            );
        }

        $pending = GpDb::one(
            'SELECT * FROM gp_account_plan_orders WHERE merchant_id = ? AND plan_code = ? AND status = ? ORDER BY id DESC LIMIT 1',
            [$merchantId, $planCode, 'pending']
        );
        if (is_array($pending) && !empty($pending['session_id'])) {
            $sess = GpDb::one(
                'SELECT status FROM gp_transactions WHERE session_id = ?',
                [$pending['session_id']]
            );
            $st = strtolower((string) ($sess['status'] ?? ''));
            if (in_array($st, ['initiated', 'pending'], true)) {
                GpJson::send(['order' => GpPlatformBilling::presentOrder($pending)], 200);
            }
        }

        $amount = GpMoney::sanitize((string) $plan['price_bdt']);
        $now = GpIds::now();
        $orderId = GpIds::make('abo', 10);
        $sessionId = GpIds::make('chs', 10);
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 1800);
        $meta = [
            'confirmationState' => 'none',
            'billingOrderId' => $orderId,
            'purchaserMerchantId' => $merchantId,
            'planCode' => $planCode,
            'planName' => $plan['name'] ?? $planCode,
            'cancelRedirect' => '/dashboard/my-payments?canceled=1',
            'returnUrl' => '/dashboard/my-payments?paid=1',
        ];

        GpDb::exec(
            'INSERT INTO gp_transactions
             (session_id, brand_id, source, source_id, customer_json, amount, currency, ledger_mode, webhook_url, metadata, status, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $sessionId,
                $billingBrandId,
                'account-plan',
                $orderId,
                json_encode([
                    'name' => (string) ($actor['email'] ?? ''),
                    'email' => (string) ($actor['email'] ?? ''),
                ], JSON_UNESCAPED_UNICODE),
                $amount,
                'BDT',
                'live',
                null,
                json_encode($meta, JSON_UNESCAPED_SLASHES),
                'pending',
                $expires,
                $now,
                $now,
            ]
        );

        GpDb::exec(
            'INSERT INTO gp_account_plan_orders (
                order_id, merchant_id, plan_id, plan_code, plan_name, amount, currency, status, session_id, trx_id, created_at, updated_at
             ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                $orderId,
                $merchantId,
                $plan['plan_id'],
                $planCode,
                $plan['name'] ?? $planCode,
                $amount,
                'BDT',
                'pending',
                $sessionId,
                null,
                $now,
                $now,
            ]
        );

        $row = GpPlatformBilling::findOrder($orderId);
        GpJson::send(['order' => GpPlatformBilling::presentOrder($row ?? [])], 201);
    }

    private static function resumeOrder(string $merchantId, string $orderId): never
    {
        $order = GpDb::one(
            'SELECT * FROM gp_account_plan_orders WHERE order_id = ? AND merchant_id = ?',
            [$orderId, $merchantId]
        );
        if ($order === null) {
            GpJson::error('NOT_FOUND', 'Order not found.', 404);
        }
        GpJson::send(['order' => GpPlatformBilling::presentOrder($order)]);
    }
}
