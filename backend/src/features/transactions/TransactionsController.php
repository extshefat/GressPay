<?php
declare(strict_types=1);

final class TransactionsController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $id = $req->part(1);
        $action = $req->part(2);

        if ($req->method === 'GET' && $id === null) {
            GpAuth::requireScope($actor, 'read_transactions');
            $status = strtolower((string) ($req->input('status', '')));
            $sql = 'SELECT * FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ?';
            $params = [$actor['brand_id'], $actor['mode']];
            if ($status !== '') {
                $upper = strtoupper($status);
                if ($upper === 'PENDING') {
                    $sql .= ' AND status IN (?, ?)';
                    $params[] = 'initiated';
                    $params[] = 'pending';
                } else {
                    $dbStatus = match ($upper) {
                        'COMPLETED' => 'completed',
                        'EXPIRED' => 'expired',
                        'FAILED' => 'failed',
                        'REFUNDED' => 'refunded',
                        default => strtolower($status),
                    };
                    $sql .= ' AND status = ?';
                    $params[] = $dbStatus;
                }
            }
            $sql .= ' ORDER BY id DESC LIMIT 100';
            $rows = GpDb::all($sql, $params);
            $transactions = array_map(
                static fn ($row) => GpPresenters::transaction($row, $brand, $merchant),
                $rows
            );
            GpJson::send(['transactions' => $transactions, 'total' => count($transactions)]);
        }

        if ($req->method === 'GET' && $id !== null && $action === null) {
            GpAuth::requireScope($actor, 'read_transactions');
            $row = GpDb::one(
                'SELECT * FROM gp_transactions WHERE session_id = ? AND brand_id = ?',
                [$id, $actor['brand_id']]
            );
            if ($row === null) {
                GpJson::error('NOT_FOUND', 'Transaction not found.', 404);
            }
            GpJson::send(GpPresenters::transaction($row, $brand, $merchant));
        }

        if ($req->method === 'POST' && $id !== null && ($action === 'cancel' || $action === 'reject')) {
            GpAuth::requireScope($actor, 'verify_payment');
            $row = GpDb::one(
                'SELECT * FROM gp_transactions WHERE session_id = ? AND brand_id = ?',
                [$id, $actor['brand_id']]
            );
            if ($row === null) {
                GpJson::error('NOT_FOUND', 'Transaction not found.', 404);
            }
            if ($row['status'] === 'completed') {
                GpJson::error('ALREADY_COMPLETED', 'Cannot reject a completed transaction.', 400);
            }
            $reason = trim((string) $req->input('reason', 'Cancelled by merchant'));
            GpDb::exec(
                'UPDATE gp_transactions SET status = ?, updated_at = ? WHERE session_id = ?',
                ['failed', GpIds::now(), $id]
            );
            $updated = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
            GpJson::send(GpPresenters::transaction($updated, $brand, $merchant));
        }

        // Merchant manual reconciliation — never available on public checkout.
        if ($req->method === 'POST' && $id !== null && $action === 'confirm') {
            GpAuth::requireScope($actor, 'verify_payment');
            GpRateLimiter::guard('confirm:' . $actor['brand_id'], 30, 60);
            $reason = trim((string) $req->input('reason', $req->input('note', '')));
            if (strlen($reason) < 8) {
                GpJson::error(
                    'REASON_REQUIRED',
                    'Manual confirmation requires an auditable reason (min 8 characters).',
                    400
                );
            }

            $row = GpDb::one(
                'SELECT * FROM gp_transactions WHERE session_id = ? AND brand_id = ?',
                [$id, $actor['brand_id']]
            );
            if ($row === null) {
                GpJson::error('NOT_FOUND', 'Transaction not found.', 404);
            }
            if (strtolower((string) $row['ledger_mode']) !== strtolower((string) $actor['mode'])) {
                GpJson::error('MODE_MISMATCH', 'Switch dashboard mode to match this transaction ledger.', 409);
            }
            if (strtolower((string) $row['status']) !== 'pending') {
                GpJson::error('INVALID_STATE', 'Only pending transactions with a submitted TxID can be confirmed.', 409);
            }
            $trxId = trim((string) ($req->input('trxId', $req->input('trx_id', $row['trx_id'] ?? '')))); if ($trxId === '') { $trxId = 'MANUAL_' . strtoupper(bin2hex(random_bytes(4))); }
            $methodCode = GpCatalog::publicCode((string) ($row['method_code'] ?? ''));
            if ($trxId === '' || $methodCode === '') {
                GpJson::error('MISSING_EVIDENCE', 'Buyer must submit a TxID before merchant confirmation.');
            }
            // Provider rails must not be short-circuited via manual confirm without reason already required —
            // still block Binance/USDT from casual confirm (use reconcile / chain verify).
            if (in_array($methodCode, ['binance_pay', 'usdt_trc20'], true)) {
                GpJson::error(
                    'USE_PROVIDER_FLOW',
                    'Confirm Binance Pay via reconcile or USDT via on-chain verify — not this shortcut.',
                    400
                );
            }

            $cat = GpCatalog::find($methodCode);
            if ($cat === null) {
                GpJson::error('UNKNOWN_METHOD', 'Unknown payment method.');
            }
            $methodRow = GpDb::one(
                'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
                [$row['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
            ) ?? ['options' => '{}', 'code' => $methodCode];
            $payable = GpRatesEngine::convert(
                $row['brand_id'],
                (string) $row['amount'],
                (string) $row['currency'],
                (string) $cat['currency']
            );

            // Stamp audit fields into metadata before markPaid.
            $meta = [];
            if (!empty($row['metadata'])) {
                $decoded = is_array($row['metadata']) ? $row['metadata'] : json_decode((string) $row['metadata'], true);
                $meta = is_array($decoded) ? $decoded : [];
            }
            $meta['manualConfirm'] = [
                'reason' => $reason,
                'byMerchantId' => $actor['merchant_id'],
                'byEmail' => $actor['email'] ?? '',
                'at' => GpIds::now(),
            ];
            GpDb::exec(
                'UPDATE gp_transactions SET metadata = ?, updated_at = ? WHERE session_id = ?',
                [json_encode($meta, JSON_UNESCAPED_SLASHES), GpIds::now(), $row['session_id']]
            );
            $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]) ?? $row;

            $paid = CheckoutController::markPaid(
                $row,
                $trxId,
                $methodCode,
                $methodRow,
                $payable,
                (string) $cat['currency'],
                null,
                'merchant_confirmed',
                [
                    'provider_ref' => $trxId,
                    'verified_amount' => $payable,
                    'verified_currency' => (string) $cat['currency'],
                    'meta' => $meta['manualConfirm'],
                ]
            );
            GpJson::send(GpPresenters::transaction($paid, $brand, $merchant));
        }

        GpJson::error('METHOD_NOT_ALLOWED', 'Unsupported method.', 405);
    }
}
