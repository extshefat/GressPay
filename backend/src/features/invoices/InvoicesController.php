<?php
declare(strict_types=1);

final class InvoicesController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $id = $req->part(1);

        if ($req->method === 'GET' && $id === null) {
            $rows = GpDb::all(
                'SELECT * FROM gp_invoices WHERE brand_id = ? ORDER BY id DESC LIMIT 100',
                [$actor['brand_id']]
            );
            GpJson::send(['invoices' => array_map(
                static fn ($row) => GpPresenters::invoice($row, $brand, $merchant),
                $rows
            )]);
        }
        if ($req->method === 'GET' && $id !== null) {
            $row = GpDb::one('SELECT * FROM gp_invoices WHERE invoice_id = ? AND brand_id = ?', [$id, $actor['brand_id']]);
            if ($row === null) {
                GpJson::error('NOT_FOUND', 'Invoice not found.', 404);
            }
            GpJson::send(['invoice' => GpPresenters::invoice($row, $brand, $merchant)]);
        }
        if ($req->method === 'POST' && $id === null) {
            $amount = GpMoney::sanitize((string) $req->input('amount', '0'));
            if ((float) $amount <= 0) {
                GpJson::error('INVALID_AMOUNT', 'Amount must be a positive number.');
            }
            $now = GpIds::now();
            $invoiceId = GpIds::make('inv', 8);
            GpDb::exec(
                'INSERT INTO gp_invoices (invoice_id, brand_id, customer_name, customer_email, amount, currency, status, due_at, note, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $invoiceId,
                    $actor['brand_id'],
                    (string) $req->input('customer_name', $req->input('clientName', '')),
                    (string) $req->input('customer_email', $req->input('clientEmail', '')),
                    $amount,
                    strtoupper((string) $req->input('currency', 'BDT')),
                    'unpaid',
                    $req->input('due_at', $req->input('dueDate')),
                    (string) $req->input('note', ''),
                    $now,
                    $now,
                ]
            );
            $row = GpDb::one('SELECT * FROM gp_invoices WHERE invoice_id = ?', [$invoiceId]);
            GpJson::send(['invoice' => GpPresenters::invoice($row, $brand, $merchant)], 201);
        }
        GpJson::error('METHOD_NOT_ALLOWED', 'Unsupported method.', 405);
    }
}
