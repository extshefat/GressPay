<?php
declare(strict_types=1);

/**
 * Account-level SaaS quotas (brands / websites + completed live checkouts per calendar month).
 * Billing month boundaries use Asia/Dhaka (consistent with default brand timezone).
 */
final class GpPlanLimits
{
    public const BILLING_TIMEZONE = 'Asia/Dhaka';

    /** Soft dashboard warning when Free-tier monthly completed count reaches this value (limit 50). */
    public const FREE_WARNING_COMPLETED = 40;

    public static function marketingCode(string $planId): string
    {
        $raw = strtolower(trim($planId));
        if ($raw === '') {
            return 'starter';
        }
        if (str_starts_with($raw, 'plan_')) {
            return substr($raw, 5);
        }
        return $raw;
    }

    /** @return array<string,mixed>|null */
    private static function merchantRow(string $merchantId): ?array
    {
        if ($merchantId === '') {
            return null;
        }
        $row = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
        return is_array($row) ? $row : null;
    }

    private static function isAdminMerchant(array $merchant): bool
    {
        $email = strtolower(trim((string) ($merchant['email'] ?? '')));
        return GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin');
    }

    /** Plan code after expiry downgrade (paid plans past plan_expires_at → starter limits). */
    public static function effectivePlanCode(array $merchant): string
    {
        if (self::isAdminMerchant($merchant)) {
            return 'lifetime';
        }
        $code = self::marketingCode((string) ($merchant['plan_id'] ?? 'starter'));
        if (in_array($code, ['starter', 'lifetime'], true)) {
            return $code;
        }
        $expRaw = trim((string) ($merchant['plan_expires_at'] ?? ''));
        if ($expRaw === '') {
            return $code;
        }
        $expTs = strtotime($expRaw);
        if ($expTs !== false && $expTs < time()) {
            return 'starter';
        }
        return $code;
    }

    public static function maxBrandsForCode(string $planCode): int
    {
        return match (self::marketingCode($planCode)) {
            'lifetime', 'enterprise' => 50,
            'pro' => 5,
            default => 1,
        };
    }

    public static function maxBrandsForMerchant(string $merchantId): int
    {
        $merchant = self::merchantRow($merchantId);
        if ($merchant === null) {
            return 1;
        }
        if (self::isAdminMerchant($merchant)) {
            return 50;
        }
        return self::maxBrandsForCode(self::effectivePlanCode($merchant));
    }

    /** @return array{startUtc:string,endUtc:string,label:string} */
    public static function currentBillingMonthWindow(): array
    {
        $tz = new DateTimeZone(self::BILLING_TIMEZONE);
        $utc = new DateTimeZone('UTC');
        $startLocal = new DateTime('first day of this month 00:00:00', $tz);
        $endLocal = new DateTime('first day of next month 00:00:00', $tz);
        $startUtc = (clone $startLocal)->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');
        $endUtc = (clone $endLocal)->setTimezone($utc)->format('Y-m-d\TH:i:s\Z');
        $label = $startLocal->format('F Y') . ' (' . self::BILLING_TIMEZONE . ')';
        return ['startUtc' => $startUtc, 'endUtc' => $endUtc, 'label' => $label];
    }

    /**
     * Monthly cap on completed live checkout sessions for the account (0 = unlimited).
     */
    public static function maxMonthlyCompletedForMerchant(string $merchantId): int
    {
        $merchant = self::merchantRow($merchantId);
        if ($merchant === null) {
            return self::FREE_MONTHLY_COMPLETED_DEFAULT;
        }
        if (self::isAdminMerchant($merchant)) {
            return 0;
        }
        $code = self::effectivePlanCode($merchant);
        $planId = (string) ($merchant['plan_id'] ?? 'starter');
        $planRow = GpDb::one(
            'SELECT credit_allowance FROM gp_plans WHERE plan_id = ? OR code = ? LIMIT 1',
            [$planId, $code]
        );
        if ($planRow === null) {
            $planRow = GpDb::one(
                'SELECT credit_allowance FROM gp_subscription_plans WHERE plan_id = ? OR code = ? LIMIT 1',
                [$planId, $code]
            );
        }
        $allowance = (int) ($planRow['credit_allowance'] ?? 0);
        if ($allowance <= 0) {
            return self::FREE_MONTHLY_COMPLETED_DEFAULT;
        }
        // Lifetime tier in seed uses very high allowance — treat as unlimited.
        if ($allowance >= 999999) {
            return 0;
        }
        return $allowance;
    }

    private const FREE_MONTHLY_COMPLETED_DEFAULT = 50;

    public static function countBrands(string $merchantId): int
    {
        return (int) (GpDb::one(
            'SELECT COUNT(*) AS c FROM gp_brands WHERE merchant_id = ?',
            [$merchantId]
        )['c'] ?? 0);
    }

    public static function countMonthlyCompletedLive(string $merchantId): int
    {
        $window = self::currentBillingMonthWindow();
        return (int) (GpDb::one(
            'SELECT COUNT(*) AS c FROM gp_transactions t
             INNER JOIN gp_brands b ON b.brand_id = t.brand_id
             WHERE b.merchant_id = ? AND t.status = ? AND t.ledger_mode = ?
               AND t.updated_at >= ? AND t.updated_at < ?',
            [$merchantId, 'completed', 'live', $window['startUtc'], $window['endUtc']]
        )['c'] ?? 0);
    }

    public static function merchantIdForBrand(string $brandId): string
    {
        $row = GpDb::one('SELECT merchant_id FROM gp_brands WHERE brand_id = ?', [$brandId]);
        return is_array($row) ? (string) ($row['merchant_id'] ?? '') : '';
    }

    /**
     * @return array{
     *   billingTimezone:string,
     *   billingMonthLabel:string,
     *   planCode:string,
     *   brands:array{used:int,limit:int,atLimit:bool},
     *   monthlyCompleted:array{used:int,limit:int|null,unlimited:bool,atLimit:bool,warning:bool}
     * }
     */
    public static function usageForMerchant(string $merchantId): array
    {
        $merchant = self::merchantRow($merchantId);
        $planCode = $merchant ? self::effectivePlanCode($merchant) : 'starter';
        $brandLimit = self::maxBrandsForMerchant($merchantId);
        $brandsUsed = self::countBrands($merchantId);
        $monthlyLimit = self::maxMonthlyCompletedForMerchant($merchantId);
        $monthlyUsed = self::countMonthlyCompletedLive($merchantId);
        $window = self::currentBillingMonthWindow();
        $unlimited = $monthlyLimit === 0;
        $warningThreshold = $planCode === 'starter' && !$unlimited
            ? self::FREE_WARNING_COMPLETED
            : (int) max(1, floor($monthlyLimit * 0.8));

        return [
            'billingTimezone' => self::BILLING_TIMEZONE,
            'billingMonthLabel' => $window['label'],
            'planCode' => $planCode,
            'brands' => [
                'used' => $brandsUsed,
                'limit' => $brandLimit,
                'atLimit' => $brandsUsed >= $brandLimit,
            ],
            'monthlyCompleted' => [
                'used' => $monthlyUsed,
                'limit' => $unlimited ? null : $monthlyLimit,
                'unlimited' => $unlimited,
                'atLimit' => !$unlimited && $monthlyUsed >= $monthlyLimit,
                'warning' => !$unlimited && $monthlyUsed >= $warningThreshold && $monthlyUsed < $monthlyLimit,
            ],
        ];
    }

    public static function assertBrandCreateAllowed(string $merchantId): void
    {
        $usage = self::usageForMerchant($merchantId);
        if (!$usage['brands']['atLimit']) {
            return;
        }
        $max = (int) $usage['brands']['limit'];
        $planCode = (string) $usage['planCode'];
        if ($max <= 1 || $planCode === 'starter') {
            GpJson::error(
                'BRAND_QUOTA',
                'Your account is on the Free plan, which includes 1 website. Upgrade your account on the Pricing page to add more.',
                403
            );
        }
        GpJson::error(
            'BRAND_QUOTA',
            "Your plan allows {$max} website(s) on your account. Upgrade to add more.",
            403
        );
    }

    public static function assertCheckoutCreateAllowed(string $brandId): void
    {
        $merchantId = self::merchantIdForBrand($brandId);
        if ($merchantId === '') {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        $usage = self::usageForMerchant($merchantId);
        if (!$usage['monthlyCompleted']['atLimit']) {
            return;
        }
        $limit = (int) ($usage['monthlyCompleted']['limit'] ?? self::FREE_MONTHLY_COMPLETED_DEFAULT);
        $label = (string) $usage['billingMonthLabel'];
        $planCode = (string) $usage['planCode'];
        if ($planCode === 'starter') {
            GpJson::error(
                'TRANSACTION_QUOTA',
                "Your account reached the Free plan limit of {$limit} completed checkouts for {$label}. Upgrade your account to keep accepting payments.",
                403
            );
        }
        GpJson::error(
            'TRANSACTION_QUOTA',
            "Your account reached its plan limit of {$limit} completed checkouts for {$label}. Upgrade your account or wait until next month.",
            403
        );
    }
}
