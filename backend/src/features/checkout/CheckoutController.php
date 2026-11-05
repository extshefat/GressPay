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
        if ($req->method === 'POST' && $a !== null && $b === 'cancel') {
            self::cancelPublic($req, $a);
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

    public static function createAuthenticated(GpRequest $req): never
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
    public static function verifyPaymentMerchant(GpRequest $req, ?string $sessionIdOverride = null): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'verify_payment');
        GpRateLimiter::guard('verify-payment:' . $actor['brand_id'], 60, 60);
        $sessionId = trim((string) ($sessionIdOverride ?? $req->input('sessionId', $req->input('session_id', ''))));
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

    private static function cancelPublic(GpRequest $req, string $sessionId): never
    {
        GpRateLimiter::guard('checkout-cancel:' . GpRateLimiter::ip(), 30, 60);
        $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionId]);
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Checkout session not found.', 404);
        }
        $row = self::expireIfNeeded($row);
        $st = strtolower((string) ($row['status'] ?? ''));
        if ($st === 'completed') {
            GpJson::error('ALREADY_PAID', 'This payment is already completed.', 409);
        }
        if (in_array($st, ['failed', 'expired', 'refunded'], true)) {
            GpJson::send([
                'ok' => true,
                'status' => strtoupper($st),
                'redirectUrl' => self::cancelRedirect($row),
                'message' => 'Session already closed.',
            ]);
        }
        $meta = self::decodeMeta($row);
        $meta['canceledAt'] = GpIds::now();
        $meta['confirmationState'] = 'canceled';
        $changed = GpDb::exec(
            "UPDATE gp_transactions SET status = ?, metadata = ?, updated_at = ? WHERE session_id = ? AND status IN ('initiated','pending')",
            ['failed', json_encode($meta, JSON_UNESCAPED_SLASHES), GpIds::now(), $sessionId]
        );
        if (!$changed) GpJson::error('SESSION_CLOSED', 'The payment status changed. Check the current status before continuing.', 409);
        if (($row['source'] ?? '') === 'account-plan') {
            GpPlatformBilling::onCheckoutCanceled($sessionId);
        }
        GpJson::send([
            'ok' => true,
            'status' => 'CANCELED',
            'redirectUrl' => self::cancelRedirect($row),
            'message' => 'Payment canceled successfully.',
        ]);
    }

    /** @param array<string,mixed> $row */
    private static function cancelRedirect(array $row): string
    {
        $meta = self::decodeMeta($row);
        $fromMeta = trim((string) ($meta['cancelRedirect'] ?? $meta['cancelUrl'] ?? ''));
        if (($row['source'] ?? '') === 'account-plan') {
            return '/dashboard/my-payments?canceled=1';
        }
        $fromMeta = $fromMeta !== '' ? $fromMeta : trim((string) ($meta['returnUrl'] ?? ''));
        if ($fromMeta !== '' && GpWebhook::validateDestination($fromMeta)['ok']) {
            return $fromMeta;
        }
        return '/';
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
        if ($mode === 'live') {
            $owner = GpDb::one('SELECT m.email_verified FROM gp_merchants m JOIN gp_brands b ON b.merchant_id = m.merchant_id WHERE b.brand_id = ?', [$brandId]);
            if (empty($owner['email_verified'])) GpJson::error('EMAIL_UNVERIFIED', 'This merchant is not ready to accept live payments.', 403);
        }
        $brandRow = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
        if ($brandRow === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        if (!GpDb::one('SELECT merchant_id FROM gp_merchants WHERE merchant_id = ? AND status = ?', [$brandRow['merchant_id'], 'active'])) {
            GpJson::error('ACCOUNT_INACTIVE', 'This business cannot accept new payments.', 403);
        }
        if (strtolower((string) ($brandRow['brand_status'] ?? 'active')) === 'inactive') {
            GpJson::error('BRAND_INACTIVE', 'This brand is inactive and cannot accept new checkouts.', 403);
        }
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
            'name' => (string) $req->input('full_name', $req->input('name', $req->input('customer_name', ''))),
            'email' => (string) $req->input('email_address', $req->input('email', $req->input('customer_email', ''))),
            'mobile' => (string) $req->input('mobile_number', $req->input('mobile', '')),
        ];
        $returnUrl = trim((string) $req->input('return_url', $req->input('returnUrl', $req->input('success_url', $req->input('redirect_url', '')))));
        $cancelUrl = trim((string) $req->input('cancel_url', ''));
        $orderId = trim((string) $req->input('order_id', $req->input('orderId', '')));
        if (strlen($orderId) > 80 || ($orderId !== '' && !preg_match('/^[A-Za-z0-9._:-]+$/', $orderId))) {
            GpJson::error('INVALID_ORDER_ID', 'order_id must be at most 80 letters, numbers, dots, underscores, colons or dashes.', 400);
        }
        if ($fixed && $link !== null) {
            $cancelUrl = ''; // Public link visitors cannot choose the redirect destination.
            $linkRedirect = trim((string) ($link['success_redirect_url'] ?? ''));
            if ($linkRedirect === '') $returnUrl = '';
            if ($linkRedirect !== '') {
                if ($returnUrl !== '' && $returnUrl !== $linkRedirect) {
                    GpJson::error('RETURN_LOCKED', 'Success redirect URL is fixed for this payment link.', 400);
                }
                $returnUrl = $linkRedirect;
            }
        }
        if ($returnUrl !== '' && !filter_var($returnUrl, FILTER_VALIDATE_URL)) {
            GpJson::error('INVALID_URL', 'return_url must be a valid URL.');
        }
        if ($returnUrl !== '' && $mode === 'live') {
            $rd = GpWebhook::validateDestination($returnUrl);
            if (!$rd['ok']) {
                GpJson::error('INVALID_URL', 'Configured success redirect URL is not allowed.', 400);
            }
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
        if ($cancelUrl !== '' && filter_var($cancelUrl, FILTER_VALIDATE_URL)) {
            $meta['cancelUrl'] = $cancelUrl;
        }
        if ($orderId !== '') {
            $meta['orderId'] = $orderId;
        }
        if ($source === 'api' && $orderId !== '') {
            $existing = GpDb::one(
                'SELECT * FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ? AND source = ? AND merchant_order_id = ?',
                [$brandId, $mode, 'api', $orderId]
            );
            if ($existing !== null) {
                if (GpMoney::sanitize((string) $existing['amount']) !== $amount || (string) $existing['currency'] !== $currency) {
                    GpJson::error('ORDER_CONFLICT', 'This order_id already belongs to a different amount or currency.', 409);
                }
                return $existing;
            }
        }
        if ($mode === 'live') {
            GpPlanLimits::assertCheckoutCreateAllowed($brandId);
        }
        $orderTitle = trim((string) $req->input('order_title', $req->input('orderTitle', $link['title'] ?? 'Payment')));
        $orderDescription = trim((string) $req->input('order_description', $req->input('orderDescription', $link['description'] ?? '')));
        if ($orderTitle !== '') {
            $meta['orderTitle'] = $orderTitle;
        }
        if ($orderDescription !== '') {
            $meta['orderDescription'] = $orderDescription;
        }
        if ($fixed && $link !== null) {
            $productImage = trim((string) ($link['product_image_url'] ?? ''));
            if ($productImage !== '') {
                $meta['productImageUrl'] = $productImage;
            }
            $customFields = PaymentLinksController::decodeCustomFieldsJson(
                isset($link['custom_fields_json']) ? (string) $link['custom_fields_json'] : null
            );
            if ($customFields !== []) {
                $meta['customFields'] = $customFields;
            }
        }

        // Stable per-session shuffle: one gateway per method_code when brand enables it.
        if (!empty($brandRow['shuffle_duplicate_gateways'])) {
            $meta['shuffledGatewayIds'] = self::pickShuffledGatewayIds($brandId);
        }

        try {
            GpDb::exec(
            'INSERT INTO gp_transactions
             (session_id, brand_id, source, source_id, customer_json, amount, currency, ledger_mode, merchant_order_id, webhook_url, metadata, status, expires_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $sessionId,
                $brandId,
                $source,
                $link['link_id'] ?? null,
                json_encode($customer, JSON_UNESCAPED_UNICODE),
                $amount,
                $currency,
                $mode,
                $source === 'api' && $orderId !== '' ? $orderId : null,
                $webhook !== '' ? $webhook : null,
                json_encode($meta, JSON_UNESCAPED_SLASHES),
                'initiated',
                $expires,
                $now,
                $now,
            ]
            );
        } catch (PDOException $e) {
            if ($source !== 'api' || $orderId === '') {
                throw $e;
            }
            $existing = GpDb::one(
                'SELECT * FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ? AND source = ? AND merchant_order_id = ?',
                [$brandId, $mode, 'api', $orderId]
            );
            if ($existing === null || GpMoney::sanitize((string) $existing['amount']) !== $amount
                || (string) $existing['currency'] !== $currency) {
                GpJson::error('ORDER_CONFLICT', 'This order_id conflicts with an existing payment.', 409);
            }
            return $existing;
        }

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
        $allowedGw = null;
        if (!empty($meta['shuffledGatewayIds']) && is_array($meta['shuffledGatewayIds'])) {
            $allowedGw = array_values(array_filter(array_map('strval', $meta['shuffledGatewayIds'])));
        }
        $methods = self::enabledMethods(
            $txn['brand_id'],
            (string) $txn['amount'],
            (string) $txn['currency'],
            $allowedGw
        );
        return GpPresenters::checkoutSession($txn, $link, is_array($brand) ? $brand : [], $methods);
    }

    /** @return list<string> */
    private static function pickShuffledGatewayIds(string $brandId): array
    {
        $rows = GpDb::all(
            'SELECT gateway_id, method_code FROM gp_gateways WHERE brand_id = ? AND status = ? ORDER BY display_order ASC, id ASC',
            [$brandId, 'active']
        );
        $byCode = [];
        foreach ($rows as $r) {
            $code = GpCatalog::publicCode((string) ($r['method_code'] ?? ''));
            if ($code === '') {
                continue;
            }
            $byCode[$code][] = (string) $r['gateway_id'];
        }
        $picked = [];
        foreach ($byCode as $ids) {
            if ($ids === []) {
                continue;
            }
            $picked[] = $ids[random_int(0, count($ids) - 1)];
        }
        return $picked;
    }

    /** Use the submitted server quote when reconciling a delayed receipt. */
    public static function submittedAmount(array $row, string $currency): string
    {
        $meta = self::decodeMeta($row);
        if (isset($meta['quotedPayable']) && ($meta['quotedCurrency'] ?? '') === $currency) {
            return (string) $meta['quotedPayable'];
        }
        return GpRatesEngine::convert($row['brand_id'], (string) $row['amount'], $row['currency'], $currency);
    }

    public static function checkoutQuote(array $row, string $method, string $gatewayId): string
    {
        $meta = self::decodeMeta($row);
        $choices = self::enabledMethods($row['brand_id'], (string) $row['amount'], $row['currency'], $meta['shuffledGatewayIds'] ?? null);
        foreach ($choices as $choice) {
            if ($choice['code'] === $method && ($gatewayId === '' || ($choice['gatewayId'] ?? '') === $gatewayId)) {
                return GpMoney::sanitize((string) $choice['payableAmount']);
            }
        }
        GpJson::error('GATEWAY_UNAVAILABLE', 'This payment method is unavailable for this checkout.', 409);
    }

    /** @param list<string>|null $allowedGatewayIds @return list<array<string,mixed>> */
    public static function enabledMethods(
        string $brandId,
        ?string $amount = null,
        ?string $currency = null,
        ?array $allowedGatewayIds = null
    ): array {
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
        $ctx = [];
        if ($amount !== null && $currency !== null) {
            $ctx = ['amount' => $amount, 'currency' => $currency, 'brandId' => $brandId];
        }
        $verifyMode = GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') === '1'
            ? strtolower((string) ($brand['verification_mode'] ?? 'trx_id')) : 'trx_id';
        $amountFormat = strtolower((string) ($brand['amount_format'] ?? 'as_is'));
        $brandFee = (float) ($brand['brand_fee'] ?? 0);
        $brandFeeType = strtolower((string) ($brand['brand_fee_type'] ?? 'fixed'));
        $allowedSet = null;
        if (is_array($allowedGatewayIds) && $allowedGatewayIds !== []) {
            $allowedSet = array_fill_keys($allowedGatewayIds, true);
        }

        $gateways = GpDb::all(
            'SELECT * FROM gp_gateways WHERE brand_id = ? AND status = ? ORDER BY display_order ASC, id ASC',
            [$brandId, 'active']
        );
        if ($gateways !== []) {
            $out = [];
            foreach ($gateways as $gw) {
                $gwId = (string) ($gw['gateway_id'] ?? '');
                if ($allowedSet !== null && $gwId !== '' && !isset($allowedSet[$gwId])) {
                    continue;
                }
                $code = GpCatalog::publicCode((string) ($gw['method_code'] ?? ''));
                $cat = GpCatalog::find($code);
                if ($cat === null || !GpCatalog::isPlatformEnabled($code)) {
                    continue;
                }
                if (($cat['availability'] ?? '') === 'planned') {
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
                    $amt = GpRatesEngine::convert($brandId, $amount, $currency ?? (string) $cat['currency'], (string) $cat['currency']);
                    if ($gw['min_amount'] !== null && $gw['min_amount'] !== ''
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
                $presented['accountType'] = $gwPresent['accountType'] ?? 'personal';
                $presented['qrImageUrl'] = $gwPresent['qrImageUrl'] ?? null;
                $presented['qrStatus'] = $gwPresent['qrStatus'];
                $presented['readiness'] = $gwPresent['readiness'];

                // Gateway fee + brand fee on payable amount shown to buyer.
                $payable = isset($presented['payableAmount']) ? (float) $presented['payableAmount'] : null;
                if ($payable !== null) {
                    $gwFee = (float) ($gw['gateway_fee'] ?? 0);
                    $gwFeeType = strtolower((string) ($gw['gateway_fee_type'] ?? 'percentage'));
                    if ($gwFee > 0) {
                        $payable += $gwFeeType === 'fixed' ? $gwFee : ($payable * $gwFee / 100.0);
                    }
                    if ($brandFee > 0) {
                        $payable += $brandFeeType === 'fixed' ? $brandFee : ($payable * $brandFee / 100.0);
                    }
                    if ($amountFormat === 'floor') {
                        $payable = floor($payable * 100) / 100;
                    } elseif ($amountFormat === 'ceil') {
                        $payable = ceil($payable * 100) / 100;
                    }
                    $presented['payableAmount'] = round($payable, 8);
                    $presented['feePercentage'] = $gwFeeType === 'percentage' ? $gwFee : (float) ($presented['feePercentage'] ?? 0);
                    $presented['fixedFee'] = $gwFeeType === 'fixed' ? $gwFee : (float) ($presented['fixedFee'] ?? 0);
                    $presented['brandFee'] = $brandFee;
                    $presented['brandFeeType'] = $brandFeeType;
                }

                // sms_auto: buyer does not need to paste TrxID (SMS still required for live settle).
                if ($verifyMode === 'sms_auto' && in_array($code, GpCatalog::bdMobileWalletCodes(), true)) {
                    $presented['requiresTxidInput'] = false;
                }

                // Rebuild instruction steps with wallet account-type verbs (Personal / Agent / Payment).
                $accountType = strtolower((string) ($gwPresent['accountType'] ?? 'personal'));
                $plugin = GpCatalog::loadPlugin((string) ($cat['slug'] ?? $cat['code'] ?? $code));
                if ($plugin) {
                    $ins = $plugin->instructions([
                        'options' => [
                            'account' => $gwPresent['account'] ?? '',
                            'account_type' => $accountType,
                            'accountType' => $accountType,
                        ],
                        'transaction' => [
                            'amount' => $presented['payableAmount'] ?? '',
                            'currency' => $presented['payableCurrency'] ?? ($presented['currency'] ?? ''),
                        ],
                    ]);
                    if (is_array($ins) && $ins !== []) {
                        $presented['instructionSteps'] = $ins;
                        $presented['instructions'] = implode(' ', array_map(
                            static fn ($s) => is_array($s) ? (string) ($s['text'] ?? '') : '',
                            $ins
                        ));
                    }
                }
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
            if (($cat['availability'] ?? '') === 'planned') {
                continue;
            }
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
        $row = self::trySmsAutoSettle($row);
        GpJson::send(GpPresenters::checkoutStatus($row));
    }

    /**
     * For sms_auto sessions waiting without TrxID, complete when a matching SMS arrives.
     *
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private static function trySmsAutoSettle(array $row): array
    {
        if (GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') !== '1') {
            return $row;
        }
        $status = strtolower((string) ($row['status'] ?? ''));
        if (!in_array($status, ['initiated', 'pending'], true)) {
            return $row;
        }
        $methodCode = GpCatalog::publicCode((string) ($row['method_code'] ?? ''));
        if ($methodCode === '' || !in_array($methodCode, GpCatalog::bdMobileWalletCodes(), true)) {
            return $row;
        }
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
        if (!is_array($brand) || strtolower((string) ($brand['verification_mode'] ?? '')) !== 'sms_auto') {
            return $row;
        }
        $existingTrx = trim((string) ($row['trx_id'] ?? ''));
        $cat = GpCatalog::find($methodCode);
        if ($cat === null) {
            return $row;
        }
        $payable = self::submittedAmount($row, (string) $cat['currency']);
        $gwAccount = null;
        if (!empty($row['gateway_id'])) {
            $g = GpDb::one(
                'SELECT account FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
                [$row['brand_id'], $row['gateway_id']]
            );
            $gwAccount = $g ? (string) ($g['account'] ?? '') : null;
        }
        $sms = $existingTrx !== ''
            ? self::matchingSms(
                (string) $row['brand_id'],
                $existingTrx,
                $payable,
                $methodCode,
                isset($row['gateway_id']) ? (string) $row['gateway_id'] : null,
                $gwAccount,
                $row
            )
            : self::matchingSmsByAmount(
                (string) $row['brand_id'],
                $payable,
                $methodCode,
                isset($row['gateway_id']) ? (string) $row['gateway_id'] : null,
                $gwAccount,
                $row
            );
        if ($sms === null) {
            return $row;
        }
        $trxId = $existingTrx !== '' ? $existingTrx : trim((string) ($sms['trx_id'] ?? ''));
        if ($trxId === '') {
            return $row;
        }
        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$row['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
        );
        if ($methodRow === null) {
            return $row;
        }
        return self::markPaid(
            $row,
            $trxId,
            $methodCode,
            $methodRow,
            $payable,
            (string) $cat['currency'],
            $sms,
            'matched'
        );
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
        if (($cat['availability'] ?? '') === 'planned') {
            GpJson::error('METHOD_UNAVAILABLE', 'Live verification for this country adapter is not available.', 409);
        }

        $methodRow = GpDb::one(
            'SELECT * FROM gp_methods WHERE brand_id = ? AND (code = ? OR code = ?) ORDER BY id DESC',
            [$row['brand_id'], $methodCode, GpCatalog::slug($methodCode)]
        );
        if ($methodRow === null || ($methodRow['status'] ?? '') !== 'active') {
            GpJson::error('METHOD_DISABLED', 'This payment method is not enabled.');
        }

        if (!GpCatalog::isPlatformEnabled($methodCode)) {
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

        $brandForMode = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
        $verifyMode = strtolower((string) ($brandForMode['verification_mode'] ?? 'trx_id'));
        $smsAuto = GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') === '1'
            && $verifyMode === 'sms_auto'
            && in_array($methodCode, GpCatalog::bdMobileWalletCodes(), true);

        $plugin = GpCatalog::loadPlugin($methodCode);
        $trxId = trim((string) $req->input('trx_id', $req->input('trxId', '')));
        if ($trxId !== '') {
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
            }
        } elseif (!$smsAuto) {
            GpJson::error('MISSING_FIELD', 'trx_id is required.');
        }

        $trxId = strtoupper(trim($trxId));
        // Anti-Fraud & Duplicate TrxID Protection (skip when sms_auto with no TrxID yet).
        if ($trxId !== '') {
            $dupCompleted = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ? AND trx_id = ? AND status = ?',
                [$row['brand_id'], $ledgerMode, strtoupper($trxId), 'completed']
            );
            if ($dupCompleted) {
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }

            $usedSms = GpDb::one(
                'SELECT id FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status = ?',
                [$row['brand_id'], strtoupper($trxId), 'used']
            );
            if ($usedSms) {
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }

            $openDup = GpDb::one(
                'SELECT session_id FROM gp_transactions
                 WHERE trx_id = ? AND brand_id = ? AND ledger_mode = ? AND session_id != ? AND status IN (?, ?)',
                [strtoupper($trxId), $row['brand_id'], $ledgerMode, $id, 'pending', 'initiated']
            );
            if ($openDup) {
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }
        }

        $senderNumber = trim((string) $req->input('sender_number', $req->input('senderNumber', '')));
        if ($smsAuto && !preg_match('/^(?:\+?880|0)1[3-9][0-9]{8}$/', $senderNumber)) {
            GpJson::error('PAYER_PHONE_REQUIRED', 'Enter the phone number used to send this payment.', 400);
        }

        $payable = self::checkoutQuote($row, $methodCode, (string) $gatewayId);
        $payableNum = (float) $payable;
        if ($payableNum < (float) $cat['minAmount'] || $payableNum > (float) $cat['maxAmount']) {
            GpJson::error(
                'AMOUNT_OUT_OF_RANGE',
                'Amount is outside this method\'s limits (' . $cat['minAmount'] . '–' . $cat['maxAmount'] . ' ' . $cat['currency'] . ').'
            );
        }

        $now = GpIds::now();
        $meta = self::decodeMeta($row);
        $meta = PaymentLinksController::mergeCustomFieldResponses($meta, $req);
        $meta['confirmationState'] = 'verifying';
        $meta['submittedAt'] = $now;
        $meta['submittedMethod'] = $methodCode;
        $meta['quotedPayable'] = $payable;
        $meta['quotedCurrency'] = (string) $cat['currency'];
        $meta['submitted_trx_id'] = $trxId;
        if (!empty($senderNumber)) {
            $meta['sender_number'] = $senderNumber;
        }

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

            $verified = TronUsdtVerifier::verify($trxId, $recv, $payable, (int) strtotime($row['created_at']));
            unset($verified['to']); // The receipt hash identifies the transfer without duplicating the receiving address.
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
        $sms = null;
        if ($trxId !== '') {
            $sms = self::matchingSms(
                $row['brand_id'],
                $trxId,
                $payable,
                $methodCode,
                isset($row['gateway_id']) ? (string) $row['gateway_id'] : null,
                $gwAccount,
                $row
            );
        } elseif ($smsAuto) {
            $sms = self::matchingSmsByAmount(
                $row['brand_id'],
                $payable,
                $methodCode,
                isset($row['gateway_id']) ? (string) $row['gateway_id'] : null,
                $gwAccount,
                $row
            );
            if ($sms !== null) {
                $trxId = trim((string) ($sms['trx_id'] ?? ''));
            }
        }

        // Persist submitted TxID (or empty for sms_auto wait) as pending — not proof of payment on live.
        GpDb::exec(
            'UPDATE gp_transactions SET trx_id = ?, method_code = ?, status = ?, metadata = ?, updated_at = ?
             WHERE session_id = ? AND status IN (?, ?)',
            [
                $trxId !== '' ? $trxId : null,
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
        // Bybit UID and Binance UID are manual rails. A pasted id or SMS row is not a provider result.
        if (in_array($methodCode, ['bybit_pay', 'binance_pay'], true)) {
            $row['confirmationState'] = 'verifying';
            $out = GpPresenters::checkoutStatus($row);
            $out['confirmationState'] = 'verifying';
            $out['message'] = $methodCode === 'binance_pay'
                ? 'Binance Pay stays unpaid until the Merchant API reports the order paid.'
                : 'Bybit UID transfers stay unpaid until a provider result is recorded.';
            GpJson::send($out);
        }
        if ($ledgerMode === 'test' && in_array($methodCode, ['bkash', 'nagad'], true)) {
            $canComplete = true;
            $evidence = 'simulated';
        } elseif ($sms !== null) {
            $canComplete = true;
            $evidence = 'matched';
        }

        if (!$canComplete) {
            $row['confirmationState'] = 'verifying';
            $waitMsg = $smsAuto && $trxId === ''
                ? 'Waiting for payment SMS confirmation on the merchant Companion device…'
                : 'Verifying your Transaction ID automatically... Please wait';
            $row['message'] = $waitMsg;
            $out = GpPresenters::checkoutStatus($row);
            $out['confirmationState'] = 'verifying';
            $out['message'] = $waitMsg;
            GpJson::send($out);
        }

        if ($trxId === '') {
            GpJson::error('MISSING_FIELD', 'A matched SMS Transaction ID is required to complete payment.', 409);
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
    /**
     * Correlate SMS received_at with checkout window (same rules as markPaid).
     * Without a session, only absolute age and future-skew checks apply.
     *
     * @param array<string,mixed> $sms
     * @param array<string,mixed>|null $session
     */
    public static function smsWithinSessionWindow(array $sms, ?array $session = null): bool
    {
        // Prefer carrier received_at; fall back to ingest created_at for legacy rows.
        $received = strtotime((string) ($sms['received_at'] ?? ''));
        if ($received === false) {
            $received = strtotime((string) ($sms['created_at'] ?? ''));
        }
        if ($received === false) {
            return false;
        }
        if ($received > time() + 300 || time() - $received > self::SMS_MAX_AGE_SEC) {
            return false;
        }
        if ($session === null) {
            return true;
        }
        $opened = strtotime((string) ($session['created_at'] ?? ''));
        $expires = strtotime((string) ($session['expires_at'] ?? ''));
        if ($opened === false) {
            return false;
        }
        if ($received < $opened - 120) {
            return false;
        }
        if ($expires !== false && $received > $expires) {
            return false;
        }
        return true;
    }

    public static function payerMatches(array $brand, array $session, array $sms): bool
    {
        if (empty($brand['require_payer_match'])) return true;
        $payer = preg_replace('/\D+/', '', (string) ($sms['payer_phone'] ?? '')) ?: '';
        if ($payer === '') return true; // Older companion evidence may not include a payer.
        $meta = self::decodeMeta($session);
        $entered = preg_replace('/\D+/', '', (string) ($meta['sender_number'] ?? '')) ?: '';
        return strlen($payer) >= 10 && strlen($entered) >= 10 && substr($payer,-10) === substr($entered,-10);
    }

    public static function matchingSms(
        string $brandId,
        string $trxId,
        string $payable,
        string $methodCode,
        ?string $gatewayId = null,
        ?string $expectedAccount = null,
        ?array $session = null
    ): ?array {
        $sms = GpDb::one(
            'SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ? AND status IN (?, ?) ORDER BY id DESC',
            [$brandId, strtoupper($trxId), 'approved', 'unmatched']
        );
        if ($sms === null) {
            return null;
        }
        $sender = GpCatalog::publicCode((string) ($sms['sender_key'] ?? ''));
        if ($sender !== '' && $sender !== $methodCode) {
            return null;
        }
        if (!self::smsWithinSessionWindow($sms, $session)) {
            return null;
        }
        $brand = GpDb::one('SELECT payment_tolerance, require_payer_match FROM gp_brands WHERE brand_id = ?', [$brandId]);
        if ($session !== null && !self::payerMatches($brand ?? [], $session, $sms)) return null;
        $tol = GpMoney::sanitize((string) ($brand['payment_tolerance'] ?? '0'));
        if (!GpMoney::withinTolerance((string) $sms['amount'], $payable, $tol)) {
            return null;
        }

        $activeSameRail = GpDb::all(
            'SELECT gateway_id, account FROM gp_gateways WHERE brand_id = ? AND method_code = ? AND status = ?',
            [$brandId, $methodCode, 'active']
        );
        $smsNumber = preg_replace('/\D+/', '', (string) ($sms['number'] ?? '')) ?: '';
        // If SMS came from a device bound to a wallet, prefer that account for matching.
        $smsDeviceId = trim((string) ($sms['device_id'] ?? ''));
        if ($smsDeviceId !== '' && ($smsNumber === '' || strlen($smsNumber) <= 5)) {
            $dev = GpDb::one(
                'SELECT bound_gateway_id FROM gp_devices WHERE device_id = ? AND brand_id = ? AND status = ?',
                [$smsDeviceId, $brandId, 'active']
            );
            $boundGw = trim((string) ($dev['bound_gateway_id'] ?? ''));
            if ($boundGw !== '') {
                foreach ($activeSameRail as $g) {
                    if ((string) $g['gateway_id'] === $boundGw) {
                        $digits = preg_replace('/\D+/', '', (string) ($g['account'] ?? '')) ?: '';
                        if ($digits !== '') {
                            $smsNumber = $digits;
                        }
                        break;
                    }
                }
            }
        }
        $knownShortcodes = ['16247', '16167', '16262', '16216', '16268', '16259'];
        $isShortcode = $smsNumber === '' || strlen($smsNumber) <= 6 || in_array($smsNumber, $knownShortcodes, true);

        if (count($activeSameRail) === 1) {
            // Single gateway on this brand for this rail: carrier shortcode SMS resolves directly to this wallet.
            if ($isShortcode) {
                $onlyAccount = preg_replace('/\D+/', '', (string) ($activeSameRail[0]['account'] ?? '')) ?: '';
                if ($onlyAccount !== '') {
                    $smsNumber = $onlyAccount;
                }
            }
        } elseif (count($activeSameRail) > 1) {
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
        }

        if ($expectedAccount !== null && $expectedAccount !== '' && $smsNumber !== '' && !$isShortcode) {
            $targetDigits = preg_replace('/\D+/', '', $expectedAccount) ?: '';
            if (strlen($targetDigits) >= 10 && strlen($smsNumber) >= 10) {
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
     * Match unused SMS to a pending sms_auto checkout by amount + rail + wallet (no buyer TrxID yet).
     *
     * @return array<string,mixed>|null
     */
    public static function matchingSmsByAmount(
        string $brandId,
        string $payable,
        string $methodCode,
        ?string $gatewayId = null,
        ?string $expectedAccount = null,
        ?array $preferSession = null
    ): ?array {
        $pending = GpDb::all("SELECT * FROM gp_transactions WHERE brand_id = ? AND status IN ('pending','initiated') AND (trx_id IS NULL OR trx_id = '')", [$brandId]);
        $eligibleSessions = [];
        $cat = GpCatalog::find($methodCode);
        foreach ($pending as $session) {
            if (GpCatalog::publicCode((string) ($session['method_code'] ?? '')) !== $methodCode
                || (string) ($session['gateway_id'] ?? '') !== (string) ($gatewayId ?? '')
                || (!empty($session['expires_at']) && strtotime($session['expires_at']) < time())) {
                continue;
            }
            $amount = self::submittedAmount($session, (string) ($cat['currency'] ?? 'BDT'));
            if (GpMoney::sanitize($amount) === GpMoney::sanitize($payable)) {
                $eligibleSessions[] = $session;
            }
        }
        if (count($eligibleSessions) !== 1) {
            return null;
        }
        $windowSession = $preferSession ?? $eligibleSessions[0];
        $candidates = GpDb::all(
            'SELECT * FROM gp_sms_data WHERE brand_id = ? AND status IN (?, ?) ORDER BY id DESC LIMIT 40',
            [$brandId, 'approved', 'unmatched']
        );
        $matches = [];
        foreach ($candidates as $sms) {
            $trx = trim((string) ($sms['trx_id'] ?? ''));
            if ($trx === '') {
                continue;
            }
            // Reuse TrxID path so amount/wallet/age/window rules stay identical.
            $hit = self::matchingSms(
                $brandId,
                $trx,
                $payable,
                $methodCode,
                $gatewayId,
                $expectedAccount,
                $windowSession
            );
            if ($hit !== null) {
                $matches[] = $hit;
            }
        }
        return count($matches) === 1 ? $matches[0] : null;
    }

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
        $trxId = strtoupper(trim($trxId));
        if (($row['ledger_mode'] ?? 'live') === 'live') {
            $requiresSms = in_array($methodCode, ['bkash', 'nagad', 'rocket', 'upay', 'cellfin'], true);
            if (($requiresSms && ($sms === null || $evidence !== 'matched'))
                || ($methodCode === 'binance_pay' && $evidence !== 'provider_confirmed')
                || ($methodCode === 'usdt_trc20' && $evidence !== 'on_chain')) {
                GpJson::error('EVIDENCE_REQUIRED', 'This payment requires verified receipt, provider or blockchain evidence.', 409);
            }
        }
        if ($sms !== null && strtolower((string) ($row['ledger_mode'] ?? 'live')) === 'live') {
            $brand = GpDb::one('SELECT verification_mode, require_payer_match FROM gp_brands WHERE brand_id = ?', [$row['brand_id']]);
            if (GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') === '1' && ($brand['verification_mode'] ?? '') === 'sms_auto') {
                $phoneMeta = self::decodeMeta($row);
                $expectedPhone = preg_replace('/\D+/', '', (string) ($phoneMeta['sender_number'] ?? '')) ?: '';
                $evidencePhone = preg_replace('/\D+/', '', (string) ($sms['payer_phone'] ?? '')) ?: '';
                if ($expectedPhone === '' || $evidencePhone === '' || substr($expectedPhone, -10) !== substr($evidencePhone, -10)) return $row;
            }
            if (!self::payerMatches($brand ?? [], $row, $sms)) return $row;
            // Keep late evidence for review, but never settle a different or expired session.
            if (!self::smsWithinSessionWindow($sms, $row)) {
                return $row;
            }
        }
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
            $lock = GpDb::driver() === 'sqlite' ? '' : ' FOR UPDATE';
            $fresh = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ? AND brand_id = ?' . $lock, [$row['session_id'],$row['brand_id']]);
            if (!$fresh || !in_array($fresh['status'], ['initiated','pending'], true)) { $pdo->rollBack(); return $fresh ?? $row; }
            if (!GpTrxClaims::claim($row['brand_id'], $row['ledger_mode'] ?? 'live', $trxId, $row['session_id'])) {
                $pdo->rollBack();
                GpJson::error('DUPLICATE_TRX','Payment evidence cannot be used for this checkout.',409);
            }
            $dup = GpDb::one(
                'SELECT session_id FROM gp_transactions WHERE brand_id = ? AND ledger_mode = ? AND trx_id = ? AND session_id != ? AND status = ?',
                [$row['brand_id'], $row['ledger_mode'] ?? 'live', strtoupper($trxId), $row['session_id'], 'completed']
            );
            if ($dup) {
                $pdo->rollBack();
                GpJson::error('DUPLICATE_TRX', 'Payment evidence cannot be used for this checkout.', 409);
            }

            if ($sms) {
                $smsLock = GpDb::exec(
                    'UPDATE gp_sms_data SET status = ?, updated_at = ? WHERE id = ? AND brand_id = ? AND status IN (?, ?)',
                    ['used', $now, $sms['id'], $row['brand_id'], 'approved', 'unmatched']
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
                  WHERE session_id = ? AND status IN (?, ?) AND (expires_at IS NULL OR expires_at >= ?)',
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
                    $now,
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
            if ($paid && ($paid['source'] ?? '') === 'account-plan') {
                GpPlatformBilling::onCheckoutCompleted($paid);
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
        $payload['eventId'] = 'evt_' . hash('sha256', $paid['session_id'] . '|payment.completed');
        GpWebhook::dispatch($brand, $whUrl, $payload, 'payment.completed');
        return $paid;
    }
}
