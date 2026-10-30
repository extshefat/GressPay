<?php
declare(strict_types=1);

final class PaymentController
{
    public static function handle(GpRequest $req): never
    {
        $action = $req->part(1) ?? '';
        $id = $req->part(2) ?? '';

        if ($req->method === 'POST' && $action === 'create') {
            CheckoutController::createAuthenticated($req);
        }
        if ($req->method === 'POST' && $action === 'verify') {
            CheckoutController::verifyPaymentMerchant($req);
        }
        if ($req->method === 'GET' && $action === 'status' && $id !== '') {
            CheckoutController::verifyPaymentMerchant($req, $id);
        }
        GpJson::error('NOT_FOUND', 'Unknown payment route.', 404);
    }
}
