<?php
declare(strict_types=1);

final class GpRouter
{
    public static function dispatch(): void
    {
        GpJson::cors();

        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $uri = '/' . trim($uri, '/');
        if ($uri === '/') {
            GpJson::send([
                'name' => 'GressPay API',
                'version' => 'v1',
                'docs' => '/api/v1/health',
            ]);
        }

        $parts = array_values(array_filter(explode('/', $uri), static fn ($p) => $p !== ''));
        if (($parts[0] ?? '') !== 'api' || ($parts[1] ?? '') !== 'v1') {
            GpJson::error('NOT_FOUND', 'Use /api/v1/*', 404);
        }

        $v1 = array_slice($parts, 2);
        $req = new GpRequest($v1);
        $head = $req->part(0) ?? '';

        if ($head === 'assets' && $req->part(1) === 'qr' && $req->method === 'GET') GpQrStorage::serve((string) $req->part(2));

        match ($head) {
            'health' => self::health($req),
            'auth' => AuthController::handle($req),
            'me' => AuthController::me($req),
            'checkout' => CheckoutController::handle($req),
            'payment' => PaymentController::handle($req),
            'payment-links' => PaymentLinksController::handle($req),
            'storefront' => PaymentLinksController::publicPage($req),
            'invoices' => InvoicesController::handle($req),
            'transactions' => TransactionsController::handle($req),
            'methods' => MethodsController::handle($req),
            'gateways' => GatewaysController::handle($req),
            'rates' => RatesController::handle($req),
            'dashboard' => DashboardController::handle($req),
            'merchant' => MerchantController::handle($req),
            'brands' => BrandsController::handle($req),
            'webhooks' => WebhooksController::handle($req),
            'companion' => CompanionController::handle($req),
            'admin' => AdminController::handle($req),
            'billing' => BillingController::handle($req),
            'team' => TeamController::handle($req),
            'binance-pay' => self::binancePay($req),
            default => GpJson::error('NOT_FOUND', 'Unknown route.', 404),
        };
    }

    private static function health(GpRequest $req): never
    {
        $sub = $req->part(1) ?? '';
        if ($sub === 'worker') {
            self::workerHealth();
        }

        $driver = 'unknown';
        $dbOk = false;
        try {
            $driver = GpDb::driver();
            GpDb::pdo()->query('SELECT 1');
            $dbOk = true;
        } catch (Throwable $e) {
            error_log('GressPay health DB check failed: ' . $e->getMessage());
        }
        $body = [
            'ok' => $dbOk,
            'product' => 'GressPay',
            'time' => GpIds::now(),
            'database' => [
                'ok' => $dbOk,
                'driver' => $driver,
            ],
        ];
        if (!$dbOk) {
            // Never expose raw DB/driver exception text to the public health endpoint.
            $body['database']['error'] = 'Database unavailable';
            GpJson::send($body, 503);
        }
        GpJson::send($body);
    }

    /** Public worker liveness: queue depth + last successful dequeue age (no secrets). */
    private static function workerHealth(): never
    {
        $pending = 0;
        $failed = 0;
        $delivered = 0;
        $lastDeliveredAt = null;
        $staleProcessing = 0;
        try {
            $pending = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_webhook_queue WHERE status IN ('pending', 'processing')"
            )['c'] ?? 0);
            $failed = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_webhook_queue WHERE status = 'failed'"
            )['c'] ?? 0);
            $delivered = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_webhook_queue WHERE status = 'delivered'"
            )['c'] ?? 0);
            $last = GpDb::one(
                "SELECT updated_at FROM gp_webhook_queue WHERE status = 'delivered' ORDER BY updated_at DESC LIMIT 1"
            );
            $lastDeliveredAt = is_array($last) ? (string) ($last['updated_at'] ?? '') : null;
            if ($lastDeliveredAt === '') {
                $lastDeliveredAt = null;
            }
            $staleCutoff = gmdate('Y-m-d\TH:i:s\Z', time() - 300);
            $staleProcessing = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_webhook_queue WHERE status = 'processing' AND updated_at < ?",
                [$staleCutoff]
            )['c'] ?? 0);
        } catch (Throwable $e) {
            error_log('GressPay worker health failed: ' . $e->getMessage());
            GpJson::send([
                'ok' => false,
                'product' => 'GressPay',
                'time' => GpIds::now(),
                'worker' => ['ok' => false, 'error' => 'Queue unavailable'],
            ], 503);
        }

        $lastAgeSec = null;
        if ($lastDeliveredAt !== null) {
            $ts = strtotime($lastDeliveredAt);
            if ($ts !== false) {
                $lastAgeSec = max(0, time() - $ts);
            }
        }
        // Ok when DB readable; warn via staleProcessing / backlog for operators.
        $ok = $staleProcessing === 0;
        GpJson::send([
            'ok' => $ok,
            'product' => 'GressPay',
            'time' => GpIds::now(),
            'worker' => [
                'ok' => $ok,
                'queuePending' => $pending,
                'queueFailed' => $failed,
                'queueDelivered' => $delivered,
                'lastDeliveredAt' => $lastDeliveredAt,
                'lastDeliveredAgeSec' => $lastAgeSec,
                'staleProcessing' => $staleProcessing,
            ],
        ], $ok ? 200 : 503);
    }

    private static function binancePay(GpRequest $req): never
    {
        $action = $req->part(1) ?? '';
        if ($req->method === 'POST' && $action === 'callback') {
            BinancePayController::callback($req);
        }
        GpJson::error('NOT_FOUND', 'Unknown binance-pay route.', 404);
    }
}
