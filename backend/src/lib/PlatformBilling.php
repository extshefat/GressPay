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

    public static function setBillingBrandId(string $brandId): void
    {
        $brandId = trim($brandId);
        if ($brandId === '') {
            GpJson::error('INVALID_BRAND', 'billing brand id is required.', 400);
        }
        $brand = GpDb::one('SELECT brand_id FROM gp_brands WHERE brand_id = ?', [$brandId]);
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
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
        if ($merchantId !== '' && $planId !== '') {
            GpDb::exec(
                'UPDATE gp_merchants SET plan_id = ?, updated_at = ? WHERE merchant_id = ?',
                [$planId, $now, $merchantId]
            );
        }
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
