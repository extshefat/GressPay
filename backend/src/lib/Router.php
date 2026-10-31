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

        match ($head) {
            'health' => self::health(),
            'auth' => AuthController::handle($req),
            'me' => AuthController::me($req),
            'checkout' => CheckoutController::handle($req),
            'payment' => PaymentController::handle($req),
            'payment-links' => PaymentLinksController::handle($req),
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
            'binance-pay' => self::binancePay($req),
            default => GpJson::error('NOT_FOUND', 'Unknown route.', 404),
        };
    }

    private static function health(): never
    {
        $driver = 'unknown';
        $dbOk = false;
        $dbError = null;
        try {
            $driver = GpDb::driver();
            GpDb::pdo()->query('SELECT 1');
            $dbOk = true;
        } catch (Throwable $e) {
            $dbError = $e->getMessage();
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
            $body['database']['error'] = $dbError;
            GpJson::send($body, 503);
        }
        GpJson::send($body);
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
