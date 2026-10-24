<?php
declare(strict_types=1);

final class BinancePayController
{
    public static function createForSession(GpRequest $req, string $sessionId): never
    {
        GpRateLimiter::guard('binance-create:' . GpRateLimiter::ip(), 20, 60);
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionId]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        $raw = strtolower((string) $row['status']);
        if (in_array($raw, ['completed', 'failed', 'expired', 'refunded'], true)) {
            GpJson::error('SESSION_CLOSED', 'Session is closed.', 409);
        }

        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$row['brand_id'], 'binance_pay', 'binance-personal']
        );
        $cat = GpCatalog::find('binance_pay');
        $ready = GpMethodReadiness::evaluate($cat, $methodRow, $brand);
        $ledgerMode = strtolower((string) ($row['ledger_mode'] ?? 'live')) === 'test' ? 'test' : 'live';

        if ($ledgerMode === 'live' && !$ready['liveReady']) {
            GpJson::error('PROVIDER_NOT_READY', implode(' ', $ready['reasons']), 503);
        }

        $creds = BinancePayClient::credentialsForBrand($brand ?? []);
        if ($creds === null && $ledgerMode === 'live') {
            GpJson::error('PROVIDER_NOT_READY', 'Binance Pay credentials not configured.', 503);
        }

        $payable = GpRatesEngine::convert(
            $row['brand_id'],
            (string) $row['amount'],
            (string) $row['currency'],
            'USDT'
        );

        $existing = GpDb::one(
            'SELECT * FROM gp_provider_orders WHERE session_id = ? AND provider = ?',
            [$sessionId, 'binance_pay']
        );
        if ($existing) {
            GpJson::send([
                'sessionId' => $sessionId,
                'merchantTradeNo' => $existing['merchant_trade_no'],
                'providerOrderId' => $existing['provider_order_id'],
                'status' => $existing['status'],
                'amount' => GpMoney::sanitize((string) $existing['amount'], 8),
                'currency' => $existing['currency'],
                'checkoutUrl' => self::checkoutUrlFromRaw($existing['raw_json'] ?? ''),
                'idempotent' => true,
            ]);
        }

        $tradeNo = 'gp' . substr(hash('sha256', $sessionId), 0, 28);
        $now = GpIds::now();

        if ($ledgerMode === 'test' || $creds === null) {
            GpDb::exec(
                'INSERT INTO gp_provider_orders (brand_id, session_id, provider, merchant_trade_no, provider_order_id, status, amount, currency, raw_json, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $row['brand_id'],
                    $sessionId,
                    'binance_pay',
                    $tradeNo,
                    null,
                    'pending_unconfigured',
                    $payable,
                    'USDT',
                    json_encode(['note' => 'Binance Pay live credentials missing or test ledger'], JSON_UNESCAPED_SLASHES),
                    $now,
                    $now,
                ]
            );
            GpDb::exec(
                'UPDATE gp_transactions SET method_code = ?, merchant_trade_no = ?, status = ?, updated_at = ? WHERE session_id = ?',
                ['binance_pay', $tradeNo, 'pending', $now, $sessionId]
            );
            GpJson::send([
                'sessionId' => $sessionId,
                'merchantTradeNo' => $tradeNo,
                'status' => 'pending_unconfigured',
                'amount' => GpMoney::sanitize($payable, 8),
                'currency' => 'USDT',
                'liveReady' => false,
                'message' => 'Binance Pay is not live-configured. No real provider order was created.',
            ], 201);
        }

        $resp = BinancePayClient::createOrder(
            $creds,
            $tradeNo,
            $payable,
            'USDT',
            (string) ($row['session_id'] ?? 'GressPay')
        );
        if (empty($resp['ok'])) {
            GpJson::error(
                'PROVIDER_UNCERTAIN',
                'Binance Pay order create did not succeed. Reconcile later; payment status unknown.',
                502
            );
        }

        $data = $resp['data']['data'] ?? $resp['data'] ?? [];
        $prepayId = (string) ($data['prepayId'] ?? $data['prepayID'] ?? '');
        $checkoutUrl = (string) ($data['checkoutUrl'] ?? $data['qrcodeLink'] ?? '');

        GpDb::exec(
            'INSERT INTO gp_provider_orders (brand_id, session_id, provider, merchant_trade_no, provider_order_id, status, amount, currency, raw_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $row['brand_id'],
                $sessionId,
                'binance_pay',
                $tradeNo,
                $prepayId !== '' ? $prepayId : null,
                'pending',
                $payable,
                'USDT',
                json_encode(['create' => $resp['data'] ?? []], JSON_UNESCAPED_SLASHES),
                $now,
                $now,
            ]
        );
        GpDb::exec(
            'UPDATE gp_transactions SET method_code = ?, merchant_trade_no = ?, status = ?, updated_at = ? WHERE session_id = ?',
            ['binance_pay', $tradeNo, 'pending', $now, $sessionId]
        );

        GpJson::send([
            'sessionId' => $sessionId,
            'merchantTradeNo' => $tradeNo,
            'providerOrderId' => $prepayId,
            'status' => 'pending',
            'amount' => GpMoney::sanitize($payable, 8),
            'currency' => 'USDT',
            'checkoutUrl' => $checkoutUrl,
            'liveReady' => true,
        ], 201);
    }

    /** Merchant-authenticated reconcile (dashboard / ops). */
    public static function reconcileForMerchant(GpRequest $req, string $sessionId): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'verify_payment');
        GpRateLimiter::guard('binance-reconcile:' . $actor['brand_id'], 20, 60);

        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionId]);
        if ($row === null || (string) $row['brand_id'] !== (string) $actor['brand_id']) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        if (strtolower((string) $row['ledger_mode']) !== strtolower((string) $actor['mode'])) {
            GpJson::error('MODE_MISMATCH', 'Ledger mode mismatch.', 409);
        }

        self::auditReconcile($actor['brand_id'], $sessionId, $actor['merchant_id'], 'merchant');
        self::reconcileInternal($sessionId);
    }

    /**
     * Query Binance and complete only on exact PAID + amount + currency + tradeNo.
     * Used by merchant reconcile and signed callbacks only.
     */
    public static function reconcileInternal(string $sessionId): never
    {
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionId]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        if (strtolower((string) $row['status']) === 'completed') {
            GpJson::send(GpPresenters::checkoutStatus($row));
        }

        $order = GpDb::one(
            'SELECT * FROM gp_provider_orders WHERE session_id = ? AND provider = ?',
            [$sessionId, 'binance_pay']
        );
        if ($order === null) {
            GpJson::error('NOT_FOUND', 'No Binance Pay order for this session.', 404);
        }

        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
        $creds = BinancePayClient::credentialsForBrand($brand ?? []);
        if ($creds === null) {
            GpJson::error('PROVIDER_NOT_READY', 'Binance Pay credentials not configured.', 503);
        }

        $q = BinancePayClient::queryOrder($creds, (string) $order['merchant_trade_no']);
        if (empty($q['ok'])) {
            GpJson::send([
                'sessionId' => $sessionId,
                'status' => 'PENDING',
                'confirmationState' => 'submitted',
                'message' => 'Provider query inconclusive; not marking failed or paid.',
            ]);
        }

        $data = $q['data']['data'] ?? $q['data'] ?? [];
        $status = strtoupper((string) ($data['status'] ?? ''));
        $paidAmount = trim((string) ($data['orderAmount'] ?? ''));
        $currency = strtoupper(trim((string) ($data['currency'] ?? '')));
        $tradeNo = (string) ($data['merchantTradeNo'] ?? '');

        if ($tradeNo === '' || $tradeNo !== (string) $order['merchant_trade_no']) {
            GpJson::error('PROVIDER_MISMATCH', 'merchantTradeNo mismatch or missing.', 409);
        }
        if ($status !== 'PAID') {
            GpJson::send(GpPresenters::checkoutStatus($row));
        }
        if ($currency === '') {
            GpJson::error('PROVIDER_MISMATCH', 'Provider currency missing.', 409);
        }
        if ($currency !== strtoupper((string) $order['currency'])) {
            GpJson::error('PROVIDER_MISMATCH', 'Currency mismatch.', 409);
        }
        if ($paidAmount === '') {
            GpJson::error('PROVIDER_MISMATCH', 'Provider orderAmount missing.', 409);
        }
        $expected = GpMoney::sanitize((string) $order['amount'], 8);
        $got = GpMoney::sanitize($paidAmount, 8);
        if (!GpMoney::withinTolerance($got, $expected, '0', 8)) {
            GpJson::error('PROVIDER_MISMATCH', 'Amount mismatch.', 409);
        }

        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$row['brand_id'], 'binance_pay', 'binance-personal']
        ) ?? ['options' => '{}', 'code' => 'binance_pay'];

        $paid = CheckoutController::markPaid(
            $row,
            (string) ($data['transactionId'] ?? $order['provider_order_id'] ?? $tradeNo),
            'binance_pay',
            $methodRow,
            $expected,
            (string) $order['currency'],
            null,
            'provider_confirmed',
            [
                'provider_ref' => (string) ($order['provider_order_id'] ?? $tradeNo),
                'verified_amount' => $expected,
                'verified_currency' => (string) $order['currency'],
                'meta' => ['query' => $data],
            ]
        );
        GpDb::exec(
            'UPDATE gp_provider_orders SET status = ?, updated_at = ? WHERE id = ?',
            ['paid', GpIds::now(), $order['id']]
        );
        GpJson::send(GpPresenters::checkoutStatus($paid));
    }

    /** @deprecated Use reconcileForMerchant or reconcileInternal */
    public static function reconcile(string $sessionId): never
    {
        // Public callers must not hit this — CheckoutController routes merchant path only.
        self::reconcileInternal($sessionId);
    }

    public static function callback(GpRequest $req): never
    {
        GpRateLimiter::guard('binance-callback:' . GpRateLimiter::ip(), 60, 60);
        $raw = $req->raw;
        $timestamp = (string) ($_SERVER['HTTP_BINANCEPAY_TIMESTAMP'] ?? '');
        $nonce = (string) ($_SERVER['HTTP_BINANCEPAY_NONCE'] ?? '');
        $signature = (string) ($_SERVER['HTTP_BINANCEPAY_SIGNATURE'] ?? '');
        $sn = (string) ($_SERVER['HTTP_BINANCEPAY_CERTIFICATE_SN'] ?? '');

        if ($nonce === '' || strlen($nonce) < 8) {
            GpJson::error('INVALID_SIGNATURE', 'Nonce required.', 401);
        }

        // Replay protection: nonce unique per provider callback.
        $seen = GpDb::one('SELECT id FROM gp_binance_callback_nonces WHERE nonce = ?', [$nonce]);
        if ($seen) {
            GpJson::error('REPLAY', 'Callback nonce already processed.', 409);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            GpJson::error('INVALID_BODY', 'Invalid callback body.', 400);
        }

        $tradeNo = (string) ($decoded['merchantTradeNo'] ?? $decoded['bizId'] ?? '');
        $order = null;
        if ($tradeNo !== '') {
            $order = GpDb::one('SELECT * FROM gp_provider_orders WHERE merchant_trade_no = ? AND provider = ?', [
                $tradeNo,
                'binance_pay',
            ]);
        }
        if ($order === null) {
            $tradeNo = (string) ($decoded['data']['merchantTradeNo'] ?? '');
            if ($tradeNo !== '') {
                $order = GpDb::one('SELECT * FROM gp_provider_orders WHERE merchant_trade_no = ? AND provider = ?', [
                    $tradeNo,
                    'binance_pay',
                ]);
            }
        }
        if ($order === null) {
            GpJson::error('NOT_FOUND', 'Unknown merchantTradeNo.', 404);
        }

        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$order['brand_id']]);
        $creds = BinancePayClient::credentialsForBrand($brand ?? []);
        if ($creds === null) {
            GpJson::error('PROVIDER_NOT_READY', 'Credentials missing.', 503);
        }
        if ($sn === '' || $sn !== $creds['certificateSn']) {
            GpJson::error('INVALID_SIGNATURE', 'Certificate SN mismatch.', 401);
        }
        if (!BinancePayClient::verifyCallbackSignature($timestamp, $nonce, $raw, $signature, $creds['secret'])) {
            GpJson::error('INVALID_SIGNATURE', 'Callback signature rejected.', 401);
        }

        try {
            GpDb::exec(
                'INSERT INTO gp_binance_callback_nonces (nonce, merchant_trade_no, brand_id, created_at) VALUES (?, ?, ?, ?)',
                [$nonce, (string) $order['merchant_trade_no'], $order['brand_id'], GpIds::now()]
            );
        } catch (Throwable $e) {
            GpJson::error('REPLAY', 'Callback nonce already processed.', 409);
        }

        self::auditReconcile((string) $order['brand_id'], (string) $order['session_id'], null, 'callback');
        // Callback is a signal only — always query provider before completing.
        self::reconcileInternal((string) $order['session_id']);
    }

    private static function auditReconcile(string $brandId, string $sessionId, ?string $merchantId, string $source): void
    {
        try {
            GpDb::exec(
                'INSERT INTO gp_audit_log (brand_id, session_id, actor_id, action, meta_json, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [
                    $brandId,
                    $sessionId,
                    $merchantId,
                    'binance_reconcile_' . $source,
                    json_encode(['source' => $source], JSON_UNESCAPED_SLASHES),
                    GpIds::now(),
                ]
            );
        } catch (Throwable $e) {
            // table may be created by ensureExtras
        }
    }

    private static function checkoutUrlFromRaw(string $raw): string
    {
        $j = json_decode($raw, true);
        if (!is_array($j)) {
            return '';
        }
        $create = $j['create']['data'] ?? $j['create'] ?? [];
        return (string) ($create['checkoutUrl'] ?? $create['qrcodeLink'] ?? '');
    }
}
