<?php
declare(strict_types=1);

/** SaaS plan payments via platform-owner brand gateways (not account-holder brand rails). */
final class GpPlatformBilling
{
    public const SETTING_BILLING_BRAND = 'saas_billing_brand_id';

    public static function billingBrandId(): ?string
    {
        try {
            $row = GpDb::one(
                'SELECT setting_value FROM gp_platform_settings WHERE setting_key = ?',
                [self::SETTING_BILLING_BRAND]
            );
            if (!is_array($row)) {
                return null;
            }
            $id = trim((string) ($row['setting_value'] ?? ''));
            return $id !== '' ? $id : null;
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function setBillingBrandId(string $brandId, bool $requireLiveGateway = true): void
    {
        $brandId = trim($brandId);
        if ($brandId === '') {
            GpJson::error('INVALID_BRAND', 'billing brand id is required.', 400);
        }
        $brand = GpDb::one('SELECT brand_id, name FROM gp_brands WHERE brand_id = ?', [$brandId]);
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        $liveCount = self::countUsableGateways($brandId);
        if ($requireLiveGateway && $liveCount < 1) {
            GpJson::error(
                'NO_LIVE_GATEWAYS',
                'Billing brand must have at least one active gateway with a receiving account (configure under that brand\'s View Gateways).',
                400
            );
        }
        $now = GpIds::now();
        $existing = GpDb::one(
            'SELECT setting_key FROM gp_platform_settings WHERE setting_key = ?',
            [self::SETTING_BILLING_BRAND]
        );
        if (is_array($existing)) {
            GpDb::exec(
                'UPDATE gp_platform_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?',
                [$brandId, $now, self::SETTING_BILLING_BRAND]
            );
        } else {
            GpDb::exec(
                'INSERT INTO gp_platform_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)',
                [self::SETTING_BILLING_BRAND, $brandId, $now]
            );
        }
    }

    /** Active gateways that can receive plan payments (account filled, or crypto/API rails). */
    public static function countUsableGateways(string $brandId): int
    {
        $rows = GpDb::all(
            "SELECT gateway_id, method_code, account, status FROM gp_gateways WHERE brand_id = ? AND LOWER(status) = 'active'",
            [$brandId]
        );
        $n = 0;
        foreach ($rows as $r) {
            $code = strtolower((string) ($r['method_code'] ?? ''));
            $account = trim((string) ($r['account'] ?? ''));
            if (in_array($code, ['binance_pay', 'usdt_trc20', 'bybit_pay'], true)) {
                $n++;
                continue;
            }
            if ($account !== '') {
                $n++;
            }
        }
        return $n;
    }

    /**
     * @return list<array{brandId:string,name:string,merchantId:string,liveGatewayCount:int}>
     */
    public static function brandOptions(): array
    {
        $rows = GpDb::all(
            'SELECT brand_id, name, merchant_id FROM gp_brands ORDER BY name ASC LIMIT 500'
        );
        $out = [];
        foreach ($rows as $r) {
            $bid = (string) ($r['brand_id'] ?? '');
            if ($bid === '') {
                continue;
            }
            $out[] = [
                'brandId' => $bid,
                'name' => (string) ($r['name'] ?? 'Brand'),
                'merchantId' => (string) ($r['merchant_id'] ?? ''),
                'liveGatewayCount' => self::countUsableGateways($bid),
            ];
        }
        return $out;
    }

    /** @return array<string,mixed>|null */
    public static function findOrder(string $orderId): ?array
    {
        $row = GpDb::one('SELECT * FROM gp_account_plan_orders WHERE order_id = ?', [$orderId]);
        return is_array($row) ? $row : null;
    }

    /** Called from CheckoutController::markPaid when source is account-plan. */
    public static function onCheckoutCompleted(array $transaction): void
    {
        if (($transaction['source'] ?? '') !== 'account-plan') {
            return;
        }
        $orderId = trim((string) ($transaction['source_id'] ?? ''));
        if ($orderId === '') {
            return;
        }
        $order = self::findOrder($orderId);
        if ($order === null) {
            return;
        }
        if (strtolower((string) ($order['status'] ?? '')) === 'completed') {
            return;
        }
        $now = GpIds::now();
        $trxId = trim((string) ($transaction['trx_id'] ?? ''));
        GpDb::exec(
            'UPDATE gp_account_plan_orders SET status = ?, trx_id = ?, session_id = ?, updated_at = ? WHERE order_id = ?',
            ['completed', $trxId !== '' ? $trxId : null, $transaction['session_id'] ?? null, $now, $orderId]
        );
        $merchantId = trim((string) ($order['merchant_id'] ?? ''));
        $planId = trim((string) ($order['plan_id'] ?? ''));
        if ($merchantId === '' || $planId === '') {
            return;
        }

        $plan = GpDb::one('SELECT * FROM gp_plans WHERE plan_id = ?', [$planId]);
        if ($plan === null) {
            $plan = GpDb::one(
                'SELECT * FROM gp_plans WHERE LOWER(code) = ? OR LOWER(plan_id) = ? LIMIT 1',
                [strtolower($planId), strtolower($planId)]
            );
            if ($plan !== null) {
                $planId = (string) $plan['plan_id'];
            }
        }

        $cycle = strtolower(trim((string) ($plan['billing_cycle'] ?? 'monthly')));
        $isLifetime = $cycle === 'lifetime' || $cycle === 'life_time' || !empty($plan['is_free']);
        $expiresAt = null;
        if (!$isLifetime) {
            $days = match ($cycle) {
                'yearly', 'annual', 'year' => 365,
                'weekly', 'week' => 7,
                default => 30,
            };
            $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + ($days * 86400));
        }

        GpDb::exec(
            'UPDATE gp_merchants SET plan_id = ?, plan_expires_at = ?, updated_at = ? WHERE merchant_id = ?',
            [$planId, $expiresAt, $now, $merchantId]
        );

        GpDb::exec(
            'UPDATE gp_subscriptions SET status = ?, updated_at = ? WHERE merchant_id = ? AND status = ?',
            ['archived', $now, $merchantId, 'active']
        );

        $subId = 'sub_' . bin2hex(random_bytes(8));
        GpDb::exec(
            'INSERT INTO gp_subscriptions (subscription_id, merchant_id, plan_id, status, credits_remaining, credits_used, starts_at, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
            [$subId, $merchantId, $planId, 'active', 0, $now, $expiresAt, $now, $now]
        );


    }

    public static function onCheckoutCanceled(string $sessionId): void
    {
        $order = GpDb::one(
            'SELECT * FROM gp_account_plan_orders WHERE session_id = ? AND status = ?',
            [$sessionId, 'pending']
        );
        if ($order === null) {
            return;
        }
        GpDb::exec(
            'UPDATE gp_account_plan_orders SET status = ?, updated_at = ? WHERE order_id = ?',
            ['canceled', GpIds::now(), $order['order_id']]
        );
    }

    /** @return array<string,mixed> */
    public static function presentOrder(array $row): array
    {
        $status = strtoupper((string) ($row['status'] ?? 'pending'));
        if ($status === 'CANCELLED') {
            $status = 'CANCELED';
        }
        return [
            'id' => (string) ($row['order_id'] ?? ''),
            'orderId' => (string) ($row['order_id'] ?? ''),
            'planId' => (string) ($row['plan_id'] ?? ''),
            'planCode' => (string) ($row['plan_code'] ?? ''),
            'planName' => (string) ($row['plan_name'] ?? ''),
            'amount' => (string) ($row['amount'] ?? '0'),
            'currency' => (string) ($row['currency'] ?? 'BDT'),
            'status' => $status,
            'trxId' => $row['trx_id'] ?? null,
            'sessionId' => $row['session_id'] ?? null,
            'checkoutUrl' => !empty($row['session_id'])
                ? '/pay/' . $row['session_id']
                : null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}
