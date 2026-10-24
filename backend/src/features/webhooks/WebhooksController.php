<?php
declare(strict_types=1);

final class WebhooksController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        if ($req->method === 'POST' && $req->part(1) === 'test-ping') {
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
            $url = $brand['webhook_url'] ?? '';
            if ($url === '' || $url === '--') {
                GpJson::error('NO_WEBHOOK', 'Set a webhook URL in settings first.');
            }
            $payload = [
                'event' => 'payment.completed',
                'transactionId' => 'tx_test_ping',
                'paymentLinkId' => null,
                'orderTitle' => 'GressPay webhook test',
                'amount' => 1.0,
                'currency' => 'USD',
                'paidAmount' => 1.0,
                'paidCurrency' => 'USD',
                'paymentMethod' => 'bkash',
                'txid' => 'TESTPING',
                'status' => 'COMPLETED',
                'timestamp' => GpIds::now(),
            ];
            $code = GpWebhook::dispatch($brand, $url, $payload, 'payment.completed');
            GpJson::send([
                'ok' => $code >= 200 && $code < 300,
                'httpCode' => $code,
            ]);
        }
        GpJson::error('NOT_FOUND', 'Unknown webhook route.', 404);
    }
}
