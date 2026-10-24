<?php
declare(strict_types=1);

final class PaymentLinksController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $id = $req->part(1);

        if ($req->method === 'GET' && $id === null) {
            $rows = GpDb::all(
                'SELECT * FROM gp_payment_links WHERE brand_id = ? ORDER BY id DESC LIMIT 100',
                [$actor['brand_id']]
            );
            $links = [];
            foreach ($rows as $row) {
                $links[] = self::present($row, $brand, $merchant);
            }
            GpJson::send(['links' => $links]);
        }
        if ($req->method === 'GET' && $id !== null) {
            $row = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ? AND brand_id = ?', [$id, $actor['brand_id']]);
            if ($row === null) {
                GpJson::error('NOT_FOUND', 'Payment link not found.', 404);
            }
            GpJson::send(['link' => self::present($row, $brand, $merchant)]);
        }
        if ($req->method === 'POST' && $id === null) {
            $title = trim((string) $req->input('title', 'Payment'));
            $amount = GpMoney::sanitize((string) $req->input('amount', '0'));
            $currency = strtoupper((string) $req->input('currency', 'BDT'));
            if ((float) $amount <= 0) {
                GpJson::error('INVALID_AMOUNT', 'Amount must be a positive number.');
            }
            $now = GpIds::now();
            $linkId = GpIds::make('pl', 8);
            $description = (string) $req->input('description', '');
            $webhook = (string) $req->input('webhookUrl', $req->input('webhook_url', ''));
            if ($webhook !== '') {
                $wh = GpWebhook::validateDestination($webhook);
                if (!$wh['ok']) {
                    GpJson::error('INVALID_URL', 'webhookUrl rejected (' . ($wh['error'] ?? 'unsafe') . ').', 400);
                }
            }
            // Sandbox dashboard mode stamps test links; buyers cannot flip this at checkout.
            $ledgerMode = $actor['mode'] === 'test' ? 'test' : 'live';
            GpDb::exec(
                'INSERT INTO gp_payment_links (link_id, brand_id, title, amount, currency, status, description, webhook_url, ledger_mode, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$linkId, $actor['brand_id'], $title, $amount, $currency, 'active', $description, $webhook !== '' ? $webhook : null, $ledgerMode, $now, $now]
            );
            $row = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$linkId]);
            GpJson::send(['link' => self::present($row, $brand, $merchant)], 201);
        }
        GpJson::error('METHOD_NOT_ALLOWED', 'Unsupported method.', 405);
    }

    private static function present(array $row, array $brand, array $merchant): array
    {
        $paid = GpDb::all(
            'SELECT amount FROM gp_transactions WHERE brand_id = ? AND source = ? AND source_id = ? AND status = ?',
            [$row['brand_id'], 'payment-link', $row['link_id'], 'completed']
        );
        $collected = 0.0;
        foreach ($paid as $p) {
            $collected += (float) $p['amount'];
        }
        return GpPresenters::paymentLink($row, $brand, $merchant, [
            'paymentsCount' => count($paid),
            'totalCollected' => $collected,
            'allowedMethods' => array_column(CheckoutController::enabledMethods($row['brand_id']), 'code'),
        ]);
    }
}
