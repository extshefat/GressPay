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
            'health' => GpJson::send(['ok' => true, 'product' => 'GressPay', 'time' => GpIds::now()]),
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
            'webhooks' => WebhooksController::handle($req),
            'companion' => CompanionController::handle($req),
            'admin' => AdminController::handle($req),
            'binance-pay' => self::binancePay($req),
            default => GpJson::error('NOT_FOUND', 'Unknown route.', 404),
        };
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
