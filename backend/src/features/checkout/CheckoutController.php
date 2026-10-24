<?php
declare(strict_types=1);

final class CheckoutController
{
    /** SMS match window (seconds) relative to SMS created_at. */
    private const SMS_MAX_AGE_SEC = 172800; // 48h

    public static function handle(GpRequest $req): never
    {
        $a = $req->part(1);
        $b = $req->part(2);

        if ($req->method === 'POST' && $a === 'create') {
            self::createAuthenticated($req);
        }
        // Merchant server-to-server status lookup (not buyer TxID submit).
        if ($req->method === 'POST' && $a === 'verify-payment') {
            self::verifyPaymentMerchant($req);
        }
        if ($req->method === 'POST' && $a !== null && $b === 'init') {
            self::initPublic($req, $a);
        }
        if ($req->method === 'GET' && $a !== null && $b === 'status') {
            self::statusPublic($a);
        }
        if ($req->method === 'POST' && $a !== null && $b === 'verify') {
            self::verifyPublic($req, $a);
        }
        if ($req->method === 'POST' && $a !== null && $b === 'binance' && $req->part(3) === 'create') {
            BinancePayController::createForSession($req, $a);
        }
        if ($req->method === 'POST' && $a !== null && $b === 'binance' && $req->part(3) === 'reconcile') {
            // Merchant-authenticated only — never public anonymous reconcile.
            BinancePayController::reconcileForMerchant($req, $a);
        }
        if ($req->method === 'GET' && $a !== null && $b === null) {
            self::statusPublic($a);
        }
        GpJson::error('NOT_FOUND', 'Unknown checkout route.', 404);
    }

    private static function createAuthenticated(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'create_payment');
        GpRateLimiter::guard('checkout:' . $actor['brand_id'], 60, 60);
        // Ledger mode comes only from authenticated actor (JWT header / API key prefix) — never from buyer body.
        $mode = $actor['mode'] === 'test' ? 'test' : 'live';
        $session = self::openSession($req, $actor['brand_id'], $mode, null, 'api');
        GpJson::send(self::sessionPayload($session), 201);
    }

    /** Merchant verifies payment status by sessionId (API key / JWT). */
    private static function verifyPaymentMerchant(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'verify_payment');
        GpRateLimiter::guard('verify-payment:' . $actor['brand_id'], 60, 60);
        $sessionId = trim((string) $req->input('sessionId', $req->input('session_id', '')));
        if ($sessionId === '') {
            GpJson::error('MISSING_FIELD', 'sessionId is required.');
        }
        $row = GpDb::one(
            'SELECT * FROM gp_transactions WHERE session_id = ? AND brand_id = ?',
            [$sessionId, $actor['brand_id']]
        );
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        // Mode isolation: test keys only see test ledger rows.
        if (strtolower((string) $row['ledger_mode']) !== strtolower((string) $actor['mode'])) {
            GpJson::error('MODE_MISMATCH', 'This session belongs to a different ledger mode.', 409);
        }
        $row = self::expireIfNeeded($row);
        GpJson::send(GpPresenters::checkoutStatus($row));
    }

    private static function initPublic(GpRequest $req, string $linkId): never
    {
        GpRateLimiter::guard('init:' . GpRateLimiter::ip(), 40, 60);

        // Resume an existing API/hosted session (chs_*) — do not create a second transaction.
        $existing = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$linkId]);
        if ($existing !== null) {
            $existing = self::expireIfNeeded($existing);
            $raw = strtolower((string) $existing['status']);
            if (in_array($raw, ['expired', 'failed', 'refunded'], true)) {
                GpJson::error('SESSION_CLOSED', 'This checkout session is closed (' . strtoupper($raw) . ').', 410);
            }
            GpJson::send(self::sessionPayload($existing), 200);
        }

        // Buyers cannot choose ledger mode. Mode is taken from the payment link (set at merchant create time).
        $link = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ? AND status = ?', [$linkId, 'active']);
        if ($link !== null) {
            $mode = self::linkLedgerMode($link);
            $session = self::openSession($req, $link['brand_id'], $mode, $link, 'payment-link');
            GpJson::send(self::sessionPayload($session), 201);
        }

        $invoice = GpDb::one('SELECT * FROM gp_invoices WHERE invoice_id = ?', [$linkId]);
        if ($invoice !== null) {
            $invStatus = strtolower((string) ($invoice['status'] ?? ''));
            if (in_array($invStatus, ['paid', 'completed', 'cancelled', 'canceled'], true)) {
                GpJson::error('INVOICE_CLOSED', 'This invoice is no longer payable.', 410);
            }
            $asLink = [
                'link_id' => $invoice['invoice_id'],
                'brand_id' => $invoice['brand_id'],
                'title' => 'Invoice ' . $invoice['invoice_id'],
                'description' => $invoice['note'] ?? '',
                'amount' => $invoice['amount'],
                'currency' => $invoice['currency'],
                'webhook_url' => null,
                'ledger_mode' => 'live',
            ];
            // Invoices are live ledger only; completion still requires evidence (SMS / merchant confirm).
            $session = self::openSession($req, $invoice['brand_id'], 'live', $asLink, 'invoice');
            GpJson::send(self::sessionPayload($session), 201);
        }

        GpJson::error('NOT_FOUND', 'Payment link not found.', 404);
    }

    /** @param array<string,mixed> $link */
    private static function linkLedgerMode(array $link): string
    {
        $mode = strtolower((string) ($link['ledger_mode'] ?? 'live'));
        return $mode === 'test' ? 'test' : 'live';
    }

    private static function openSession(GpRequest $req, string $brandId, string $mode, ?array $link, string $source): array
    {
        $mode = $mode === 'test' ? 'test' : 'live';
        $fixed = in_array($source, ['payment-link', 'invoice'], true) && $link !== null;

        if ($fixed) {
            // Fixed-price integrity: never accept buyer-supplied amount/currency for links/invoices.
            $amount = GpMoney::sanitize((string) ($link['amount'] ?? '0'));
            $currency = strtoupper((string) ($link['currency'] ?? 'BDT'));
            $buyerAmount = $req->input('amount', null);
            $buyerCurrency = $req->input('currency', null);
            if ($buyerAmount !== null && $buyerAmount !== '' && GpMoney::sanitize((string) $buyerAmount) !== $amount) {
                GpJson::error('AMOUNT_LOCKED', 'Payment link / invoice amount cannot be changed by the buyer.', 400);
            }
            if ($buyerCurrency !== null && $buyerCurrency !== '' && strtoupper((string) $buyerCurrency) !== $currency) {
                GpJson::error('AMOUNT_LOCKED', 'Payment link / invoice currency cannot be changed by the buyer.', 400);
            }
            // Webhook only from merchant-configured link (or brand later) — never buyer body on public init.
            $webhook = (string) ($link['webhook_url'] ?? '');
        } else {
            $amount = GpMoney::sanitize((string) $req->input('amount', '0'));
            $currency = strtoupper((string) $req->input('currency', 'BDT'));
            $webhook = (string) $req->input('webhook_url', $req->input('webhookUrl', ''));
        }

        if ((float) $amount <= 0) {
            GpJson::error('INVALID_AMOUNT', 'Amount must be a positive number.');
        }

        $now = GpIds::now();
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 1800);
        $sessionId = GpIds::make('chs', 10);
        $customer = [
            'name' => (string) $req->input('full_name', $req->input('name', '')),
            'email' => (string) $req->input('email_address', $req->input('email', '')),
            'mobile' => (string) $req->input('mobile_number', $req->input('mobile', '')),
        ];
        $returnUrl = trim((string) $req->input('return_url', $req->input('returnUrl', '')));
        if ($returnUrl !== '' && !filter_var($returnUrl, FILTER_VALIDATE_URL)) {
            GpJson::error('INVALID_URL', 'return_url must be a valid URL.');
        }
        if ($webhook !== '') {
            $wh = GpWebhook::validateDestination($webhook);
            if (!$wh['ok']) {
                // Merchant API create may set webhook; reject unsafe destinations.
                if ($source === 'api') {
                    GpJson::error('INVALID_URL', 'webhook_url rejected (' . ($wh['error'] ?? 'unsafe') . ').', 400);
                }
                $webhook = '';
            }
        }
        $meta = $req->input('metadata', []);
        if (!is_array($meta)) {
            $meta = [];
        }
        $meta['confirmationState'] = 'none';
        if ($returnUrl !== '') {
            $meta['returnUrl'] = $returnUrl;
        }
        $orderTitle = trim((string) $req->input('order_title', $req->input('orderTitle', $link['title'] ?? 'Payment')));
        $orderDescription = trim((string) $req->input('order_description', $req->input('orderDescription', $link['description'] ?? '')));
        if ($orderTitle !== '') {
            $meta['orderTitle'] = $orderTitle;
        }
        if ($orderDescription !== '') {
            $meta['orderDescription'] = $orderDescription;
        }

        GpDb::exec(
            'INSERT INTO gp_transactions
             (session_id, brand_id, source, source_id, customer_json, amount, currency, ledger_mode, webhook_url, metadata, status, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $sessionId,
                $brandId,
                $source,
                $link['link_id'] ?? null,
                json_encode($customer, JSON_UNESCAPED_UNICODE),
                $amount,
                $currency,
                $mode,
                $webhook !== '' ? $webhook : null,
                json_encode($meta, JSON_UNESCAPED_SLASHES),
                'initiated',
                $expires,
                $now,
                $now,
            ]
        );

        return GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionId]);
    }

    private static function sessionPayload(array $txn): array
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$txn['brand_id']]);
        $meta = [];
        if (!empty($txn['metadata'])) {
            $decoded = is_array($txn['metadata']) ? $txn['metadata'] : json_decode((string) $txn['metadata'], true);
            $meta = is_array($decoded) ? $decoded : [];
        }
        $link = [
            'link_id' => $txn['source_id'] ?? $txn['session_id'],
            'title' => (string) ($meta['orderTitle'] ?? 'Payment'),
            'description' => (string) ($meta['orderDescription'] ?? ''),
        ];
        if (($txn['source'] ?? '') === 'payment-link' && !empty($txn['source_id'])) {
            $found = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$txn['source_id']]);
            if ($found) {
                $link = $found;
            }
        }
        if (($txn['source'] ?? '') === 'invoice' && !empty($txn['source_id'])) {
            $inv = GpDb::one('SELECT * FROM gp_invoices WHERE invoice_id = ?', [$txn['source_id']]);
            if ($inv) {
                $link = [
                    'link_id' => $inv['invoice_id'],
                    'title' => 'Invoice ' . $inv['invoice_id'],
                    'description' => $inv['note'] ?? '',
                ];
            }
        }
        $methods = self::enabledMethods($txn['brand_id'], (string) $txn['amount'], (string) $txn['currency']);
        return GpPresenters::checkoutSession($txn, $link, $brand, $methods);
    }

    /** @return list<array<string,mixed>> */
    public static function enabledMethods(string $brandId, ?string $amount = null, ?string $currency = null): array
    {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
        $ctx = [];
        if ($amount !== null && $currency !== null) {
            $ctx = ['amount' => $amount, 'currency' => $currency, 'brandId' => $brandId];
        }

        $gateways = GpDb::all(
            'SELECT * FROM gp_gateways WHERE brand_id = ? AND status = ? ORDER BY display_order ASC, id ASC',
            [$brandId, 'active']
        );
        if ($gateways !== []) {
            $out = [];
            foreach ($gateways as $gw) {
                $code = GpCatalog::publicCode((string) ($gw['method_code'] ?? ''));
                $cat = GpCatalog::find($code);
                if ($cat === null || empty($cat['releaseScope'])) {
                    continue;
                }
                $readiness = GatewaysController::readiness($gw);
                if (!in_array($readiness, ['live_ready', 'ready_test'], true)) {
                    continue;
                }
                if ($code === 'binance_pay' || $code === 'usdt_trc20') {
                    $methodRow = [
                        'status' => 'active',
                        'options' => json_encode(['account' => $gw['account'] ?? '']),
                        'code' => $code,
                    ];
                    $presented = GpPresenters::method($cat, $methodRow, $ctx, $brand);
                    if (empty($presented['liveReady'])) {
                        continue;
                    }
                } else {
                    if (trim((string) ($gw['account'] ?? '')) === '') {
                        continue;
                    }
                    $methodRow = [
                        'status' => 'active',
                        'options' => json_encode(['account' => $gw['account']]),
                        'code' => $code,
                    ];
                    $presented = GpPresenters::method($cat, $methodRow, $ctx, $brand);
                }
                // Amount limits
                if ($amount !== null && $amount !== '') {
                    $amt = GpMoney::sanitize($amount);
                    if ($gw['min_amount'] !== null && $gw['min_amount'] !== ''
                        && !GpMoney::withinTolerance($amt, (string) $gw['min_amount'], '999999999', 8)
                        && function_exists('bccomp') && bccomp($amt, GpMoney::sanitize((string) $gw['min_amount']), 8) < 0) {
                        continue;
                    }
                    if ($gw['max_amount'] !== null && $gw['max_amount'] !== ''
                        && function_exists('bccomp') && bccomp($amt, GpMoney::sanitize((string) $gw['max_amount']), 8) > 0) {
                        continue;
                    }
                }
                $gwPresent = GatewaysController::present($gw, true);
                $presented['gatewayId'] = $gwPresent['gatewayId'];
                $presented['displayName'] = $gwPresent['displayName'];
                $presented['name'] = $gwPresent['displayName'] !== ''
                    ? $gwPresent['displayName']
                    : $presented['name'];
                $presented['depositAddressOrNumber'] = $gwPresent['account'];
                $presented['qrImageUrl'] = $gwPresent['qrImageUrl'] ?? null;
                $presented['qrStatus'] = $gwPresent['qrStatus'];
                $presented['readiness'] = $gwPresent['readiness'];
                $out[] = $presented;
            }
            if ($out !== []) {
                return $out;
            }
        }

        // Legacy fallback: single gp_methods row per code
        $connected = GpDb::all('SELECT * FROM gp_methods WHERE brand_id = ?', [$brandId]);
        $map = [];
        foreach ($connected as $row) {
            $map[GpCatalog::publicCode($row['code'])] = $row;
        }
        $out = [];
        foreach (GpCatalog::releaseMethods() as $cat) {
            $row = $map[$cat['code']] ?? null;
            if (!$row || ($row['status'] ?? '') !== 'active') {
                continue;
            }
            $presented = GpPresenters::method($cat, $row, $ctx, $brand);
            $code = $cat['code'];
            if (in_array($code, ['binance_pay', 'usdt_trc20'], true) && empty($presented['liveReady'])) {
                continue;
            }
            $out[] = $presented;
        }
        return $out;
    }

    private static function statusPublic(string $id): never
    {
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        $row = self::expireIfNeeded($row);
        GpJson::send(GpPresenters::checkoutStatus($row));
    }

    /** @param array<string,mixed> $row @return array<string,mixed> */
    private static function expireIfNeeded(array $row): array
    {
        $raw = strtolower((string) $row['status']);
        if (in_array($raw, ['completed', 'failed', 'expired', 'refunded'], true)) {
            return $row;
        }
        if (!empty($row['expires_at']) && strtotime((string) $row['expires_at']) < time()) {
            GpDb::exec(
                'UPDATE gp_transactions SET status = ?, updated_at = ? WHERE session_id = ? AND status IN (?, ?)',
                ['expired', GpIds::now(), $row['session_id'], 'initiated', 'pending']
            );
            $fresh = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]);
            return $fresh ?? $row;
        }
        return $row;
    }

    private static function verifyPublic(GpRequest $req, string $id): never
    {
        GpRateLimiter::guard('verify:' . GpRateLimiter::ip(), 30, 60);
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }

        $row = self::expireIfNeeded($row);
        $rawStatus = strtolower((string) $row['status']);

        if ($rawStatus === 'completed') {
            GpJson::send(GpPresenters::checkoutStatus($row));
        }
        if (in_array($rawStatus, ['failed', 'expired', 'refunded'], true)) {
            GpJson::error(
                'SESSION_CLOSED',
                'This checkout session can no longer accept verification (' . strtoupper($rawStatus) . ').',
                409
            );
        }
        if (!in_array($rawStatus, ['initiated', 'pending'], true)) {
            GpJson::error('INVALID_STATE', 'Checkout is not open for verification.', 409);
        }

        // Session ledger_mode is authoritative — never override from buyer headers/body.
        $ledgerMode = strtolower((string) ($row['ledger_mode'] ?? 'live')) === 'test' ? 'test' : 'live';

        $methodCode = GpCatalog::publicCode((string) $req->input('method', $row['method_code'] ?? ''));
        $cat = GpCatalog::find($methodCode);
        if ($cat === null) {
            GpJson::error('UNKNOWN_METHOD', 'Unknown payment method.');
        }

        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$row['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
        );
        if ($methodRow === null || ($methodRow['status'] ?? '') !== 'active') {
            GpJson::error('METHOD_DISABLED', 'This payment method is not enabled.');
        }

        if (empty($cat['releaseScope'])) {
            GpJson::error('METHOD_DISABLED', 'This payment method is not available in this release.');
        }

        // Buyers must never override merchant destination (query/body).
        foreach (['account', 'depositAddressOrNumber', 'mobile_number', 'receiveAddress', 'destination'] as $forbidden) {
            if ($req->input($forbidden, null) !== null) {
                GpJson::error('REJECTED_FIELD', 'Payment destination cannot be set by the buyer.', 400);
            }
        }

        $gatewayId = trim((string) $req->input('gatewayId', $req->input('gateway_id', $row['gateway_id'] ?? '')));
        $gatewayRow = null;
        if ($gatewayId !== '') {
            $gatewayRow = GpDb::one(
                'SELECT * FROM gp_gateways WHERE brand_id = ? AND gateway_id = ? AND method_code = ? AND status = ?',
                [$row['brand_id'], $gatewayId, $methodCode, 'active']
            );
            if ($gatewayRow === null) {
                GpJson::error('GATEWAY_NOT_FOUND', 'Selected gateway is not available.', 404);
            }
        } else {
            $gatewayRow = GpDb::one(
                'SELECT * FROM gp_gateways WHERE brand_id = ? AND method_code = ? AND status = ? ORDER BY display_order ASC, id ASC',
                [$row['brand_id'], $methodCode, 'active']
            );
            if ($gatewayRow !== null) {
                $gatewayId = (string) $gatewayRow['gateway_id'];
            }
        }
        if ($gatewayRow !== null) {
            $acc = trim((string) ($gatewayRow['account'] ?? ''));
            $methodRow['options'] = json_encode(['account' => $acc, 'depositAddressOrNumber' => $acc], JSON_UNESCAPED_SLASHES);
            if ($gatewayRow['min_amount'] !== null && $gatewayRow['min_amount'] !== '') {
                $payableCheck = GpRatesEngine::convert(
                    $row['brand_id'],
                    (string) $row['amount'],
                    (string) $row['currency'],
                    (string) $cat['currency']
                );
                if (function_exists('bccomp')
                    && bccomp(GpMoney::sanitize($payableCheck), GpMoney::sanitize((string) $gatewayRow['min_amount']), 8) < 0) {
                    GpJson::error('AMOUNT_OUT_OF_RANGE', 'Amount is below this gateway minimum.', 400);
                }
            }
            if ($gatewayRow['max_amount'] !== null && $gatewayRow['max_amount'] !== '') {
                $payableCheck = GpRatesEngine::convert(
                    $row['brand_id'],
                    (string) $row['amount'],
                    (string) $row['currency'],
                    (string) $cat['currency']
                );
                if (function_exists('bccomp')
                    && bccomp(GpMoney::sanitize($payableCheck), GpMoney::sanitize((string) $gatewayRow['max_amount']), 8) > 0) {
                    GpJson::error('AMOUNT_OUT_OF_RANGE', 'Amount is above this gateway maximum.', 400);
                }
            }
            GpDb::exec(
                'UPDATE gp_transactions SET gateway_id = ?, method_code = ?, updated_at = ? WHERE session_id = ?',
                [$gatewayId, $methodCode, GpIds::now(), $id]
            );
            $row['gateway_id'] = $gatewayId;
        }

        // Binance Pay: buyers do not paste order IDs — use provider order flow.
        if ($methodCode === 'binance_pay') {
            GpJson::error(
                'USE_PROVIDER_FLOW',
                'Binance Pay must be started via POST /api/v1/checkout/{sessionId}/binance/create. Do not paste order IDs.',
                400
            );
        }

        $plugin = GpCatalog::loadPlugin($methodCode);
        $trxId = trim((string) $req->input('trx_id', $req->input('trxId', '')));
        if ($plugin) {
            $trxId = $plugin->normalizeTrx($trxId);
            $check = $plugin->verifyTx([
                'trx_id' => $trxId,
                'transaction' => $row,
                'mode' => $ledgerMode,
            ]);
            if (empty($check['ok'])) {
                GpJson::error('INVALID_TRX', (string) ($check['message'] ?? 'Transaction ID is not valid for this rail.'));
            }
            if (!empty($check['trx_id'])) {
                $trxId = (string) $check['trx_id'];
            }
        } elseif ($trxId === '') {
            GpJson::error('MISSING_FIELD', 'trx_id is required.');
        }

        if ($trxId === '') {
            GpJson::error('MISSING_FIELD', 'trx_id is required.');
        }

        // Block reuse of a TxID already tied to a completed (or other open) session for this brand.
        $dup = GpDb::one(
            'SELECT session_id, status FROM gp_transactions
             WHERE trx_id = ? AND brand_id = ? AND session_id != ? AND status IN (?, ?, ?)',
            [$trxId, $row['brand_id'], $id, 'completed', 'pending', 'initiated']
        );
        if ($dup) {
            if (strtolower((string) $dup['status']) === 'completed') {
                GpJson::error('DUPLICATE_TRX', 'This transaction ID is already used.');
            }
            if ((string) $dup['session_id'] !== $id) {
                GpJson::error('DUPLICATE_TRX', 'This transaction ID is already attached to another open checkout.');
            }
        }

        $payable = GpRatesEngine::convert(
            $row['brand_id'],
            (string) $row['amount'],
            (string) $row['currency'],
            (string) $cat['currency']
        );
        $payableNum = (float) $payable;
        if ($payableNum < (float) $cat['minAmount'] || $payableNum > (float) $cat['maxAmount']) {
            GpJson::error(
                'AMOUNT_OUT_OF_RANGE',
                'Amount is outside this method\'s limits (' . $cat['minAmount'] . '–' . $cat['maxAmount'] . ' ' . $cat['currency'] . ').'
            );
        }

        $now = GpIds::now();
        $meta = self::decodeMeta($row);
        $meta['confirmationState'] = 'submitted';
        $meta['submittedAt'] = $now;
        $meta['submittedMethod'] = $methodCode;

        // —— USDT TRC-20 on-chain verification (distinct from Binance Pay / SMS) ——
        if ($methodCode === 'usdt_trc20') {
            if ($ledgerMode === 'test') {
                // Test ledger may simulate only after format check — never claim on-chain.
                $meta['confirmationState'] = 'simulated';
                GpDb::exec(
                    'UPDATE gp_transactions SET trx_id = ?, chain_tx_hash = ?, method_code = ?, status = ?, metadata = ?, updated_at = ?
                     WHERE session_id = ? AND status IN (?, ?)',
                    [$trxId, $trxId, $methodCode, 'pending', json_encode($meta, JSON_UNESCAPED_SLASHES), $now, $id, 'initiated', 'pending']
                );
                $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
                $paid = self::markPaid($row, $trxId, $methodCode, $methodRow, $payable, (string) $cat['currency'], null, 'simulated');
                GpJson::send(GpPresenters::checkoutStatus($paid));
            }

            $opts = json_decode((string) ($methodRow['options'] ?? '{}'), true) ?: [];
            $recv = trim((string) ($opts['account'] ?? $opts['depositAddressOrNumber'] ?? ''));
            $chainDup = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE brand_id = ? AND chain_tx_hash = ? AND session_id != ? AND status = ?',
                [$row['brand_id'], $trxId, $id, 'completed']
            );
            if ($chainDup) {
                GpJson::error('DUPLICATE_TRX', 'This chain transaction hash is already used.');
            }

            $verified = TronUsdtVerifier::verify($trxId, $recv, $payable);
            GpDb::exec(
                'UPDATE gp_transactions SET trx_id = ?, chain_tx_hash = ?, method_code = ?, status = ?, metadata = ?, updated_at = ?
                 WHERE session_id = ? AND status IN (?, ?)',
                [
                    $trxId,
                    $trxId,
                    $methodCode,
                    'pending',
                    json_encode(array_merge($meta, ['chainCheck' => $verified]), JSON_UNESCAPED_SLASHES),
                    $now,
                    $id,
                    'initiated',
                    'pending',
                ]
            );
            $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
            if (!empty($verified['ok'])) {
                $paid = self::markPaid(
                    $row,
                    $trxId,
                    $methodCode,
                    $methodRow,
                    $payable,
                    (string) $cat['currency'],
                    null,
                    'on_chain',
                    [
                        'provider_ref' => $trxId,
                        'verified_amount' => $verified['amount'] ?? $payable,
                        'verified_currency' => 'USDT',
                        'meta' => $verified,
                    ]
                );
                GpJson::send(GpPresenters::checkoutStatus($paid));
            }
            // Pending confirmations or not found yet — stay PENDING
            GpJson::send(GpPresenters::checkoutStatus($row));
        }

        $gwAccount = null;
        if (!empty($row['gateway_id'])) {
            $g = GpDb::one(
                'SELECT account FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
                [$row['brand_id'], $row['gateway_id']]
            );
            $gwAccount = $g ? (string) ($g['account'] ?? '') : null;
        }
        $sms = self::matchingSms(
            $row['brand_id'],
            $trxId,
            $payable,
            $methodCode,
            isset($row['gateway_id']) ? (string) $row['gateway_id'] : null,
            $gwAccount
        );

        // Persist submitted TxID as pending (submitted) — not proof of payment on live.
        GpDb::exec(
            'UPDATE gp_transactions SET trx_id = ?, method_code = ?, status = ?, metadata = ?, updated_at = ?
             WHERE session_id = ? AND status IN (?, ?)',
            [
                $trxId,
                $methodCode,
                'pending',
                json_encode($meta, JSON_UNESCAPED_SLASHES),
                $now,
                $id,
                'initiated',
                'pending',
            ]
        );
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$id]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }

        // Evidence rules:
        // - test ledger: format-valid TxID may simulate completion (sandbox only) for SMS rails.
        // - live + matching SMS: complete with matched evidence.
        // - live without SMS: stay PENDING.
        $canComplete = false;
        $evidence = 'none';
        if ($ledgerMode === 'test' && in_array($methodCode, ['bkash', 'nagad'], true)) {
            $canComplete = true;
            $evidence = 'simulated';
        } elseif ($sms !== null) {
            $canComplete = true;
            $evidence = 'matched';
        }

        if (!$canComplete) {
            GpJson::send(GpPresenters::checkoutStatus($row));
        }

        $paid = self::markPaid(
            $row,
            $trxId,
            $methodCode,
            $methodRow,
            $payable,
            (string) $cat['currency'],
            $sms,
            $evidence
        );
        GpJson::send(GpPresenters::checkoutStatus($paid));
    }

    /** @param array<string,mixed> $row @return array<string,mixed> */
    private static function decodeMeta(array $row): array
    {
        $raw = $row['metadata'] ?? '{}';
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /** @param array<string,mixed> $row */
    /**
     * @param string|null $gatewayId Session-selected gateway; used for multi-account safety
     * @param string|null $expectedAccount Gateway receiving number when known
     */
    public static function matchingSms(
        string $brandId,
        string $trxId,
        string $payable,
        string $methodCode,
        ?string $gatewayId = null,
        ?string $expectedAccount = null
    ): ?array {
        $sms = GpDb::one(
            'SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ? ORDER BY id DESC',
            [$brandId, $trxId, 'approved']
        );
        if ($sms === null) {
            return null;
        }
        $sender = GpCatalog::publicCode((string) ($sms['sender_key'] ?? ''));
        if ($sender !== '' && $sender !== $methodCode) {
            return null;
        }
        $created = strtotime((string) ($sms['created_at'] ?? ''));
        if ($created !== false && (time() - $created) > self::SMS_MAX_AGE_SEC) {
            return null;
        }
        $brand = GpDb::one('SELECT payment_tolerance FROM gp_brands WHERE brand_id = ?', [$brandId]);
        $tol = GpMoney::sanitize((string) ($brand['payment_tolerance'] ?? '0'));
        if (!GpMoney::withinTolerance((string) $sms['amount'], $payable, $tol)) {
            return null;
        }

        $activeSameRail = GpDb::all(
            'SELECT gateway_id, account FROM gp_gateways WHERE brand_id = ? AND method_code = ? AND status = ?',
            [$brandId, $methodCode, 'active']
        );
        $smsNumber = preg_replace('/\D+/', '', (string) ($sms['number'] ?? '')) ?: '';
        if (count($activeSameRail) > 1) {
            // Multi-account: require SMS number match to expected gateway account (no amount-only guess).
            $targetAccount = $expectedAccount;
            if ($gatewayId !== null && $gatewayId !== '') {
                foreach ($activeSameRail as $g) {
                    if ((string) $g['gateway_id'] === $gatewayId) {
                        $targetAccount = (string) ($g['account'] ?? '');
                        break;
                    }
                }
            }
            $targetDigits = preg_replace('/\D+/', '', (string) $targetAccount) ?: '';
            if ($smsNumber === '' || $targetDigits === '') {
                return null;
            }
            // Compare last 10–11 digits (BD mobiles)
            $a = substr($smsNumber, -11);
            $b = substr($targetDigits, -11);
            if ($a !== $b && substr($smsNumber, -10) !== substr($targetDigits, -10)) {
                return null;
            }
        } elseif ($expectedAccount !== null && $expectedAccount !== '' && $smsNumber !== '') {
            $targetDigits = preg_replace('/\D+/', '', $expectedAccount) ?: '';
            if ($targetDigits !== '') {
                $a = substr($smsNumber, -11);
                $b = substr($targetDigits, -11);
                if ($a !== $b && substr($smsNumber, -10) !== substr($targetDigits, -10)) {
                    return null;
                }
            }
        }
        return $sms;
    }

    /**
     * Complete a checkout only via conditional UPDATE (idempotent under concurrency).
     *
     * @param array<string,mixed> $row
     * @param array<string,mixed> $methodRow
     * @param array<string,mixed>|null $sms
     * @return array<string,mixed>
     */
    /**
     * @param array<string,mixed> $row
     * @param array<string,mixed> $methodRow
     * @param array<string,mixed>|null $sms
     * @param array<string,mixed> $evidenceExtra
     * @return array<string,mixed>
     */
    public static function markPaid(
        array $row,
        string $trxId,
        string $methodCode,
        array $methodRow,
        string $payable,
        string $localCurrency,
        ?array $sms,
        string $evidence = 'matched',
        array $evidenceExtra = []
    ): array {
        $now = GpIds::now();
        $fees = GpFeeEngine::compute($methodRow, $payable, $localCurrency);
        $meta = self::decodeMeta($row);
        $meta['confirmationState'] = $evidence;
        $meta['confirmedAt'] = $now;
        if ($sms) {
            $meta['smsId'] = $sms['id'] ?? null;
        }

        $providerRef = (string) ($evidenceExtra['provider_ref'] ?? $trxId);
        $verifiedAmount = (string) ($evidenceExtra['verified_amount'] ?? $payable);
        $verifiedCurrency = (string) ($evidenceExtra['verified_currency'] ?? $localCurrency);
        $chainHash = $methodCode === 'usdt_trc20' ? $trxId : ($row['chain_tx_hash'] ?? null);

        $pdo = GpDb::pdo();
        $pdo->beginTransaction();
        try {
            $dup = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE trx_id = ? AND brand_id = ? AND session_id != ? AND status = ?',
                [$trxId, $row['brand_id'], $row['session_id'], 'completed']
            );
            if ($dup) {
                $pdo->rollBack();
                GpJson::error('DUPLICATE_TRX', 'This transaction ID is already used.');
            }

            if ($sms) {
                $smsLock = GpDb::exec(
                    'UPDATE gp_sms_data SET status = ?, updated_at = ? WHERE id = ? AND status = ?',
                    ['used', $now, $sms['id'], 'approved']
                );
                if ($smsLock === 0) {
                    $pdo->rollBack();
                    $fresh = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]);
                    return $fresh ?? $row;
                }
            }

            $n = GpDb::exec(
                'UPDATE gp_transactions SET trx_id = ?, method_code = ?, fee = ?, discount = ?, local_net = ?, local_currency = ?,
                 status = ?, metadata = ?, evidence_type = ?, evidence_ref = ?, verified_amount = ?, verified_currency = ?,
                 verified_at = ?, chain_tx_hash = COALESCE(?, chain_tx_hash), updated_at = ?
                 WHERE session_id = ? AND status IN (?, ?)',
                [
                    $trxId,
                    $methodCode,
                    $fees['fee'],
                    $fees['discount'],
                    $fees['local_net'],
                    $fees['local_currency'],
                    'completed',
                    json_encode($meta, JSON_UNESCAPED_SLASHES),
                    $evidence,
                    $providerRef,
                    $verifiedAmount,
                    $verifiedCurrency,
                    $now,
                    $chainHash,
                    $now,
                    $row['session_id'],
                    'initiated',
                    'pending',
                ]
            );

            if ($n === 0) {
                $pdo->rollBack();
                $fresh = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]);
                return $fresh ?? $row;
            }

            try {
                GpDb::exec(
                    'INSERT INTO gp_payment_evidence (brand_id, session_id, evidence_type, provider_ref, amount, currency, meta_json, verified_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $row['brand_id'],
                        $row['session_id'],
                        $evidence,
                        $providerRef,
                        $verifiedAmount,
                        $verifiedCurrency,
                        json_encode($evidenceExtra['meta'] ?? [], JSON_UNESCAPED_SLASHES),
                        $now,
                        $now,
                    ]
                );
            } catch (Throwable $e) {
                // unique evidence row already present — ok
            }

            $paid = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]);
            if ($paid && ($paid['source'] ?? '') === 'invoice' && $paid['source_id']) {
                GpDb::exec(
                    'UPDATE gp_invoices SET status = ?, updated_at = ? WHERE invoice_id = ? AND brand_id = ?',
                    ['paid', $now, $paid['source_id'], $paid['brand_id']]
                );
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $paid = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$row['session_id']]);
        if ($paid === null) {
            return $row;
        }

        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$paid['brand_id']]);
        $link = null;
        if (($paid['source'] ?? '') === 'payment-link' && $paid['source_id']) {
            $link = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$paid['source_id']]);
        }
        // Prefer brand webhook; session webhook only if set from merchant link at create time.
        $whUrl = $paid['webhook_url'] ?? null;
        if ($whUrl === null || $whUrl === '') {
            $whUrl = $brand['webhook_url'] ?? null;
        }
        $payload = GpPresenters::webhookPayload($paid, $brand, $link);
        $payload['eventId'] = 'evt_' . hash('sha256', $paid['session_id'] . '|payment.completed|' . ($paid['verified_at'] ?? $now));
        GpWebhook::dispatch($brand, $whUrl, $payload, 'payment.completed');
        return $paid;
    }
}
