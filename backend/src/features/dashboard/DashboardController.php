<?php
declare(strict_types=1);

final class DashboardController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $action = $req->part(1);
        if ($req->method === 'GET' && $action === 'metrics') {
            self::metrics($actor);
        }
        GpJson::error('NOT_FOUND', 'Unknown dashboard route.', 404);
    }

    private static function metrics(array $actor): never
    {
        $rows = GpDb::all('SELECT * FROM gp_transactions WHERE brand_id = ?', [$actor['brand_id']]);
        $completed = array_values(array_filter($rows, static fn ($r) => $r['status'] === 'completed'));
        $today = gmdate('Y-m-d');
        $todayCount = 0;
        $usd = 0.0;
        $bdt = 0.0;
        $rates = GpRatesEngine::usdMap($actor['brand_id']);
        $history = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = gmdate('Y-m-d', time() - ($i * 86400));
            $history[$day] = ['date' => $day, 'bdt' => 0.0, 'cryptoUsd' => 0.0];
        }

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
            }
            if (isset($history[$day])) {
                if ($cur === 'BDT') {
                    $history[$day]['bdt'] += $amt;
                }
                if (in_array($cur, ['USD', 'USDT'], true)) {
                    $history[$day]['cryptoUsd'] += $amt;
                }
            }
        }

        $links = GpDb::all('SELECT id FROM gp_payment_links WHERE brand_id = ? AND status = ?', [$actor['brand_id'], 'active']);
        $success = count($rows) === 0 ? 0.0 : round(count($completed) / max(count($rows), 1) * 100, 1);

        GpJson::send([
            'totalRevenueUsd' => round($usd, 2),
            'totalRevenueBdt' => round($bdt, 2),
            'todayTransactions' => $todayCount,
            'successRate' => $success,
            'activeLinksCount' => count($links),
            'pendingSettlementUsd' => round($usd * 0.02, 2),
            'volumeHistory' => array_values($history),
        ]);
    }
}
