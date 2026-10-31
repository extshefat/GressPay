<?php
declare(strict_types=1);

final class WebhooksController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $p1 = $req->part(1);
        $p2 = $req->part(2);
        $p3 = $req->part(3);

        if ($req->method === 'GET' && $p1 === 'deliveries') {
            self::listDeliveries($actor);
        }

        if ($req->method === 'POST' && $p1 === 'deliveries' && $p2 !== null && $p3 === 'retry') {
            GpRateLimiter::guard('webhook-retry:' . $actor['brand_id'], 30, 60);
            self::retryDelivery($actor, $p2);
        }

        if ($req->method === 'POST' && $p1 === 'test-ping') {
            GpRateLimiter::guard('webhook-test:' . $actor['brand_id'], 10, 60);
            self::testPing($actor);
        }

        GpJson::error('NOT_FOUND', 'Unknown webhook route.', 404);
    }

    /** @param array<string,mixed> $actor */
    private static function testPing(array $actor): never
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $url = trim((string) ($brand['webhook_url'] ?? ''));
        if ($url === '' || $url === '--') {
            GpJson::error('NO_WEBHOOK', 'Set a webhook URL on the Webhooks page first.', 400);
        }
        $payload = [
            'eventId' => 'evt_test_' . bin2hex(random_bytes(4)),
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
            'message' => $code >= 200 && $code < 300
                ? 'Test webhook accepted by your endpoint.'
                : 'Test delivery failed — check Delivery logs below.',
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function listDeliveries(array $actor): never
    {
        if (GpAuth::activeBrandId($actor) === '') {
            GpJson::send(['deliveries' => [], 'noBrand' => true]);
        }
        $rows = GpDb::all(
            'SELECT id, event_id, session_id, event_name, url, http_code, status, note, attempt, created_at, updated_at
             FROM gp_webhook_deliveries
             WHERE brand_id = ?
             ORDER BY id DESC
             LIMIT 100',
            [$actor['brand_id']]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int) $r['id'],
                'eventId' => (string) ($r['event_id'] ?? ''),
                'sessionId' => ($r['session_id'] ?? '') !== '' ? (string) $r['session_id'] : null,
                'eventName' => (string) ($r['event_name'] ?? ''),
                'url' => (string) ($r['url'] ?? ''),
                'httpCode' => isset($r['http_code']) ? (int) $r['http_code'] : null,
                'status' => (string) ($r['status'] ?? ''),
                'note' => ($r['note'] ?? '') !== '' ? (string) $r['note'] : null,
                'attempt' => (int) ($r['attempt'] ?? 1),
                'createdAt' => (string) ($r['created_at'] ?? ''),
                'updatedAt' => (string) ($r['updated_at'] ?? ''),
            ];
        }
        GpJson::send(['deliveries' => $out]);
    }

    /** @param array<string,mixed> $actor */
    private static function retryDelivery(array $actor, string $deliveryId): never
    {
        $id = (int) $deliveryId;
        if ($id <= 0) {
            GpJson::error('INVALID_ID', 'Invalid delivery id.', 400);
        }
        $row = GpDb::one(
            'SELECT * FROM gp_webhook_deliveries WHERE id = ? AND brand_id = ?',
            [$id, $actor['brand_id']]
        );
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Delivery log not found.', 404);
        }
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        $payload = json_decode((string) ($row['payload'] ?? '{}'), true);
        if (!is_array($payload)) {
            GpJson::error('INVALID_PAYLOAD', 'Stored payload is not valid JSON.', 500);
        }
        $url = trim((string) ($row['url'] ?? ''));
        if ($url === '') {
            GpJson::error('NO_URL', 'Delivery row has no target URL.', 400);
        }
        $event = (string) ($row['event_name'] ?? 'payment.completed');
        $code = GpWebhook::dispatch($brand, $url, $payload, $event);
        GpJson::send([
            'ok' => $code >= 200 && $code < 300,
            'httpCode' => $code,
            'message' => $code >= 200 && $code < 300 ? 'Webhook redelivered.' : 'Retry failed — see latest log row.',
        ]);
    }
}
