<?php
declare(strict_types=1);

define('GRESSPAY_ROOT', dirname(__DIR__));
define('GRESSPAY_SRC', GRESSPAY_ROOT . '/src');

spl_autoload_register(static function (string $class): void {
    $map = [
        'GpConfig' => GRESSPAY_SRC . '/lib/Config.php',
        'GpDb' => GRESSPAY_SRC . '/lib/Db.php',
        'GpJson' => GRESSPAY_SRC . '/lib/Json.php',
        'GpRequest' => GRESSPAY_SRC . '/lib/Request.php',
        'GpJwt' => GRESSPAY_SRC . '/lib/Jwt.php',
        'GpAuth' => GRESSPAY_SRC . '/lib/Auth.php',
        'GpRateLimiter' => GRESSPAY_SRC . '/lib/RateLimiter.php',
        'GpMoney' => GRESSPAY_SRC . '/lib/Money.php',
        'GpIds' => GRESSPAY_SRC . '/lib/Ids.php',
        'GpWebhook' => GRESSPAY_SRC . '/lib/Webhook.php',
        'GpCrypto' => GRESSPAY_SRC . '/lib/Crypto.php',
        'GpFeeEngine' => GRESSPAY_SRC . '/lib/FeeEngine.php',
        'GpRatesEngine' => GRESSPAY_SRC . '/lib/RatesEngine.php',
        'GpCatalog' => GRESSPAY_SRC . '/lib/Catalog.php',
        'GpPresenters' => GRESSPAY_SRC . '/lib/Presenters.php',
        'GpRouter' => GRESSPAY_SRC . '/lib/Router.php',
        'GpMethodReadiness' => GRESSPAY_SRC . '/lib/MethodReadiness.php',
        'GpPlatform' => GRESSPAY_SRC . '/lib/Platform.php',
        'BinancePayClient' => GRESSPAY_SRC . '/providers/BinancePayClient.php',
        'GoogleOAuthClient' => GRESSPAY_SRC . '/providers/GoogleOAuthClient.php',
        'TronUsdtVerifier' => GRESSPAY_SRC . '/providers/TronUsdtVerifier.php',
        'R2Client' => GRESSPAY_SRC . '/providers/R2Client.php',
        'GatewayInterface' => GRESSPAY_SRC . '/gateways/GatewayInterface.php',
        'GressPayBaseGateway' => GRESSPAY_SRC . '/gateways/GatewayInterface.php',
        'AuthController' => GRESSPAY_SRC . '/features/auth/AuthController.php',
        'CheckoutController' => GRESSPAY_SRC . '/features/checkout/CheckoutController.php',
        'PaymentController' => GRESSPAY_SRC . '/features/checkout/PaymentController.php',
        'PaymentLinksController' => GRESSPAY_SRC . '/features/payment-links/PaymentLinksController.php',
        'InvoicesController' => GRESSPAY_SRC . '/features/invoices/InvoicesController.php',
        'MethodsController' => GRESSPAY_SRC . '/features/methods/MethodsController.php',
        'GatewaysController' => GRESSPAY_SRC . '/features/gateways/GatewaysController.php',
        'TransactionsController' => GRESSPAY_SRC . '/features/transactions/TransactionsController.php',
        'RatesController' => GRESSPAY_SRC . '/features/rates/RatesController.php',
        'DashboardController' => GRESSPAY_SRC . '/features/dashboard/DashboardController.php',
        'MerchantController' => GRESSPAY_SRC . '/features/merchant/MerchantController.php',
        'WebhooksController' => GRESSPAY_SRC . '/features/webhooks/WebhooksController.php',
        'CompanionController' => GRESSPAY_SRC . '/features/companion/CompanionController.php',
        'BinancePayController' => GRESSPAY_SRC . '/features/binance/BinancePayController.php',
        'AdminController' => GRESSPAY_SRC . '/features/admin/AdminController.php',
    ];
    if (isset($map[$class])) {
        require_once $map[$class];
    }
});

GpConfig::load();
GpConfig::assertProductionSecrets();
GpDb::boot();
