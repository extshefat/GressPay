<?php
declare(strict_types=1);

final class DashboardController
{
    public static function setupSteps(array $actor): array
    {
        $brand = (string) ($actor['brand_id'] ?? '');
        $count = static fn (string $sql): bool => $brand !== '' && (int) (GpDb::one($sql, [$brand])['c'] ?? 0) > 0;
        return [
            ['label' => 'Create your brand', 'href' => '/dashboard/brands', 'complete' => $brand !== ''],
            ['label' => 'Add a receiving wallet', 'href' => '/dashboard/methods', 'complete' => $count("SELECT COUNT(*) AS c FROM gp_gateways WHERE brand_id = ? AND status = 'active' AND account <> ''")],
            ['label' => 'Pair and bind your phone', 'href' => '/dashboard/devices', 'complete' => $count("SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = 'active' AND bound_gateway_id IS NOT NULL AND bound_gateway_id <> '' AND last_seen_at IS NOT NULL")],
            ['label' => 'Create a website API key', 'href' => '/dashboard/api-keys', 'complete' => $count("SELECT COUNT(*) AS c FROM gp_api_keys WHERE brand_id = ? AND status = 'active'")],
            ['label' => 'Complete a test checkout', 'href' => '/dashboard/payment-links', 'complete' => $count("SELECT COUNT(*) AS c FROM gp_transactions WHERE brand_id = ? AND ledger_mode = 'test' AND status = 'completed'")],
            ['label' => 'Check signed webhook delivery', 'href' => '/dashboard/webhooks', 'complete' => $count("SELECT COUNT(*) AS c FROM gp_webhook_deliveries WHERE brand_id = ? AND status = 'completed'")],
        ];
    }

    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $action = $req->part(1);
        if ($req->method === 'GET' && $action === 'metrics') {
            GpTeam::requireCan($actor, 'dashboard', 'view');
            self::metrics($actor, $req);
        }
        if ($req->method === 'GET' && $action === 'reconciliation') {
            GpTeam::requireCan($actor, 'dashboard', 'view');
            self::reconciliation($actor);
        }
        GpJson::error('NOT_FOUND', 'Unknown dashboard route.', 404);
    }

    /**
     * Brand-scoped unmatched SMS + pending checkouts for merchant review.
     * Never returns sealed secrets or full SMS bodies (none are stored).
     *
     * @param array<string,mixed> $actor
     */
    private static function reconciliation(array $actor): never
    {
        $brandId = GpAuth::activeBrandId($actor);
        if ($brandId === '') {
            GpJson::send([
                'pendingSessions' => [],
                'unmatchedSms' => [],
                'counts' => ['pendingSessions' => 0, 'unmatchedSms' => 0],
            ]);
        }

        $pendingRows = GpDb::all(
            "SELECT session_id, amount, currency, method_code, status, trx_id, gateway_id, ledger_mode, expires_at, created_at, updated_at
             FROM gp_transactions
             WHERE brand_id = ? AND status IN ('pending', 'initiated')
             ORDER BY id DESC
             LIMIT 100",
            [$brandId]
        );
        $pendingSessions = [];
        foreach ($pendingRows as $r) {
            $pendingSessions[] = [
                'sessionId' => (string) $r['session_id'],
                'amount' => (string) $r['amount'],
                'currency' => (string) $r['currency'],
                'methodCode' => GpCatalog::publicCode((string) ($r['method_code'] ?? '')),
                'status' => (string) $r['status'],
                'trxId' => $r['trx_id'] !== null && $r['trx_id'] !== '' ? (string) $r['trx_id'] : null,
                'gatewayId' => $r['gateway_id'] !== null && $r['gateway_id'] !== '' ? (string) $r['gateway_id'] : null,
                'ledgerMode' => (string) ($r['ledger_mode'] ?? 'live'),
                'expiresAt' => (string) ($r['expires_at'] ?? ''),
                'createdAt' => (string) ($r['created_at'] ?? ''),
                'updatedAt' => (string) ($r['updated_at'] ?? ''),
            ];
        }

        $smsRows = GpDb::all(
            "SELECT id, sender_key, amount, trx_id, number, status, received_at, created_at, device_id
             FROM gp_sms_data
             WHERE brand_id = ? AND status IN ('approved', 'unmatched')
             ORDER BY id DESC
             LIMIT 100",
            [$brandId]
        );
        $unmatchedSms = [];
        foreach ($smsRows as $s) {
            $unmatchedSms[] = [
                'id' => (int) $s['id'],
                'rail' => GpCatalog::publicCode((string) ($s['sender_key'] ?? '')),
                'amount' => (string) $s['amount'],
                'trxId' => (string) ($s['trx_id'] ?? ''),
                'walletHint' => self::maskWallet((string) ($s['number'] ?? '')),
                'status' => (string) $s['status'],
                'receivedAt' => (string) ($s['received_at'] ?? ''),
                'createdAt' => (string) ($s['created_at'] ?? ''),
                'hasDevice' => trim((string) ($s['device_id'] ?? '')) !== '',
            ];
        }

        GpJson::send([
            'pendingSessions' => $pendingSessions,
            'unmatchedSms' => $unmatchedSms,
            'counts' => [
                'pendingSessions' => count($pendingSessions),
                'unmatchedSms' => count($unmatchedSms),
            ],
            'note' => 'Manual confirm on Transactions requires a reason and is distinct from automatic SMS/provider evidence.',
        ]);
    }

    private static function maskWallet(string $number): string
    {
        $digits = preg_replace('/\D+/', '', $number) ?: '';
        if (strlen($digits) < 6) {
            return $digits === '' ? '' : '••••';
        }
        return substr($digits, 0, 3) . str_repeat('•', max(0, strlen($digits) - 5)) . substr($digits, -2);
    }

    private static function metrics(array $actor, GpRequest $req): never
    {
        $range = (int) $req->input('days', 7);
        if (!in_array($range, [7, 30], true)) {
            $range = 7;
        }

        if (GpAuth::activeBrandId($actor) === '') {
            GpJson::send([
                'totalRevenueUsd' => 0,
                'totalRevenueBdt' => 0,
                'todayTransactions' => 0,
                'todayRevenueBdt' => 0,
                'activeMethodsCount' => 0,
                'connectedDevicesCount' => 0,
                'onlineDevicesCount' => 0,
                'successRate' => 0,
                'activeLinksCount' => 0,
                'pendingCheckoutCount' => 0,
                'unmatchedSmsCount' => 0,
                'lastDeviceSyncAt' => null,
                'volumeHistory' => [],
                'railBreakdown' => [],
                'rangeDays' => $range,
                'subscription' => [
                    'planId' => 'starter',
                    'planName' => 'Starter',
                    'planExpiresAt' => null,
                    'deviceLimit' => 1,
                    'methodLimit' => 2,
                    'devicesUsed' => 0,
                    'methodsUsed' => 0,
                ],
                'planUsage' => GpPlanLimits::usageForMerchant((string) $actor['merchant_id']),
                'noBrand' => true,
                'setupSteps' => self::setupSteps($actor),
            ]);
        }

        $rows = GpDb::all('SELECT * FROM gp_transactions WHERE brand_id = ?', [$actor['brand_id']]);
        $completed = array_values(array_filter($rows, static fn ($r) => $r['status'] === 'completed'));
        $today = gmdate('Y-m-d');
        $todayCount = 0;
        $todayBdt = 0.0;
        $usd = 0.0;
        $bdt = 0.0;
        $rates = GpRatesEngine::usdMap($actor['brand_id']);
        $history = [];
        for ($i = $range - 1; $i >= 0; $i--) {
            $day = gmdate('Y-m-d', time() - ($i * 86400));
            $history[$day] = ['date' => $day, 'bdt' => 0.0, 'cryptoUsd' => 0.0];
        }

        $railVolume = [
            'bkash' => 0.0,
            'nagad' => 0.0,
            'rocket' => 0.0,
            'upay' => 0.0,
            'binance_pay' => 0.0,
            'bybit_pay' => 0.0,
            'usdt_trc20' => 0.0,
            'cellfin' => 0.0,
        ];

        foreach ($completed as $row) {
            $amt = (float) $row['amount'];
            $cur = (string) $row['currency'];
            $inUsd = ($cur === 'USD' || $cur === 'USDT') ? $amt : ($amt / max($rates[$cur] ?? 122.5, 0.0001));
            $usd += $inUsd;
            if ($cur === 'BDT') {
                $bdt += $amt;
            } else {
                $bdt += $inUsd * ($rates['BDT'] ?? 122.5);
            }
            $day = substr((string) $row['created_at'], 0, 10);
            if (str_starts_with((string) $row['created_at'], $today) || $day === $today) {
                $todayCount++;
                if ($cur === 'BDT') {
                    $todayBdt += $amt;
                } else {
                    $todayBdt += $inUsd * ($rates['BDT'] ?? 122.5);
                }
            }
            if (isset($history[$day])) {
                if ($cur === 'BDT') {
                    $history[$day]['bdt'] += $amt;
                }
                if (in_array($cur, ['USD', 'USDT'], true)) {
                    $history[$day]['cryptoUsd'] += $amt;
                }
            }
            $code = GpCatalog::publicCode((string) ($row['method_code'] ?? ''));
            if ($code !== '' && array_key_exists($code, $railVolume)) {
                $railVolume[$code] += ($cur === 'BDT') ? $amt : ($inUsd * ($rates['BDT'] ?? 122.5));
            }
        }

        $links = GpDb::all('SELECT id FROM gp_payment_links WHERE brand_id = ? AND status = ?', [$actor['brand_id'], 'active']);
        $pendingCheckout = 0;
        foreach ($rows as $r) {
            $st = strtolower((string) ($r['status'] ?? ''));
            if (in_array($st, ['initiated', 'pending'], true)) {
                $pendingCheckout++;
            }
        }
        $unmatchedSms = (int) (GpDb::one(
            "SELECT COUNT(*) as c FROM gp_sms_data WHERE brand_id = ? AND status = ?",
            [$actor['brand_id'], 'approved']
        )['c'] ?? 0);
        $lastDeviceSync = GpDb::one(
            'SELECT MAX(last_seen_at) AS last_sync FROM gp_devices WHERE brand_id = ? AND status = ?',
            [$actor['brand_id'], 'active']
        );
        $success = count($rows) === 0 ? 0.0 : round(count($completed) / max(count($rows), 1) * 100, 1);
        $activeMethods = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_gateways WHERE brand_id = ? AND status = ?", [$actor['brand_id'], 'active'])['c'] ?? 0);
        $devices = (int) (GpDb::one("SELECT COUNT(*) as c FROM gp_devices WHERE brand_id = ? AND status = ?", [$actor['brand_id'], 'active'])['c'] ?? 0);
        $tenMinAgo = gmdate('Y-m-d H:i:s', time() - 600);
        $onlineDevices = (int) (GpDb::one(
            "SELECT COUNT(*) as c FROM gp_devices WHERE brand_id = ? AND status = ? AND last_seen_at >= ?",
            [$actor['brand_id'], 'active', $tenMinAgo]
        )['c'] ?? 0);

        $merchant = GpDb::one('SELECT plan_id, plan_expires_at FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $planId = (string) ($merchant['plan_id'] ?? 'starter');
        $planRow = GpDb::one('SELECT * FROM gp_plans WHERE code = ? OR plan_id = ? LIMIT 1', [$planId, $planId]);
        if ($planRow === null) {
            $planRow = GpDb::one('SELECT * FROM gp_subscription_plans WHERE code = ? OR plan_id = ? LIMIT 1', [$planId, $planId]);
        }

        $railBreakdown = [];
        foreach ($railVolume as $code => $vol) {
            $railBreakdown[] = [
                'code' => $code,
                'label' => match ($code) {
                    'bkash' => 'bKash',
                    'nagad' => 'Nagad',
                    'rocket' => 'Rocket',
                    'upay' => 'Upay',
                    'cellfin' => 'Cellfin',
                    'binance_pay' => 'Binance Pay',
                    'bybit_pay' => 'Bybit Pay',
                    'usdt_trc20' => 'USDT TRC20',
                    default => $code,
                },
                'volumeBdt' => round($vol, 2),
            ];
        }

        GpJson::send([
            'totalRevenueUsd' => round($usd, 2),
            'setupSteps' => self::setupSteps($actor),
            'totalRevenueBdt' => round($bdt, 2),
            'todayTransactions' => $todayCount,
            'todayRevenueBdt' => round($todayBdt, 2),
            'activeMethodsCount' => $activeMethods,
            'connectedDevicesCount' => $devices,
            'onlineDevicesCount' => $onlineDevices,
            'successRate' => $success,
            'activeLinksCount' => count($links),
            'pendingCheckoutCount' => $pendingCheckout,
            'unmatchedSmsCount' => $unmatchedSms,
            'lastDeviceSyncAt' => $lastDeviceSync['last_sync'] ?? null,
            'volumeHistory' => array_values($history),
            'railBreakdown' => $railBreakdown,
            'rangeDays' => $range,
            'subscription' => [
                'planId' => $planId,
                'planName' => $planRow['name'] ?? ucfirst($planId),
                'planExpiresAt' => $merchant['plan_expires_at'] ?? null,
                'deviceLimit' => (int) ($planRow['device_limit'] ?? 1),
                'methodLimit' => (int) ($planRow['method_limit'] ?? 2),
                'devicesUsed' => $devices,
                'methodsUsed' => $activeMethods,
            ],
            'planUsage' => GpPlanLimits::usageForMerchant((string) $actor['merchant_id']),
        ]);
    }
}
