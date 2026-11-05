<?php
declare(strict_types=1);

final class GpPresenters
{
    public static function status(string $raw): string
    {
        $map = [
            'initiated' => 'PENDING',
            'pending' => 'PENDING',
            'completed' => 'COMPLETED',
            'paid' => 'PAID',
            'unpaid' => 'SENT',
            'canceled' => 'CANCELLED',
            'cancelled' => 'CANCELLED',
            'expired' => 'EXPIRED',
            'failed' => 'FAILED',
            'refunded' => 'REFUNDED',
            'draft' => 'DRAFT',
            'sent' => 'SENT',
            'overdue' => 'OVERDUE',
        ];
        $key = strtolower($raw);
        return $map[$key] ?? strtoupper($raw);
    }

    public static function num(mixed $v): float
    {
        return round((float) $v, 2);
    }

    /** Real brand asset path under /methods/ (extension varies: svg|png). */
    public static function methodLogoPath(string $code): string
    {
        static $files = [
            'bkash' => 'bkash.svg',
            'nagad' => 'nagad.svg',
            'rocket' => 'rocket.svg',
            'upay' => 'upay.svg',
            'cellfin' => 'cellfin.png',
            'bangla_qr' => 'bangla_qr.svg',
            'bangla_qr_v2' => 'bangla_qr_v2.svg',
            'pathaopay' => 'pathaopay.svg',
            'mcash' => 'mcash.png',
            'ok_wallet' => 'ok_wallet.png',
            'tap' => 'tap.png',
            'aamar_pay' => 'aamar_pay.png',
            'usdt_trc20' => 'usdt_trc20.png',
            'binance_pay' => 'binance_pay.png',
            'bybit_pay' => 'bybit_pay.png',
        ];
        $key = strtolower(trim($code));
        $file = $files[$key] ?? ($key . '.svg');
        return '/methods/' . $file;
    }

    public static function user(array $merchant, array $brand): array
    {
        $email = strtolower(trim((string) ($merchant['email'] ?? '')));
        $isAdmin = GpConfig::isAdmin($email) || (!empty($merchant['email_verified']) && ($merchant['role'] ?? '') === 'admin');
        $role = $isAdmin ? 'admin' : ($merchant['role'] ?? 'merchant');
        $planId = $isAdmin ? 'lifetime' : ($merchant['plan_id'] ?? 'starter');
        $mid = (string) ($merchant['merchant_id'] ?? '');

        // Fetch active subscription & credit balance
        $sub = $mid !== '' ? GpDb::one('SELECT * FROM gp_subscriptions WHERE merchant_id = ? AND status = ? ORDER BY id DESC LIMIT 1', [$mid, 'active']) : null;
        $creditRow = $mid !== '' ? GpDb::one('SELECT balance_after FROM gp_credit_transactions WHERE merchant_id = ? ORDER BY id DESC LIMIT 1', [$mid]) : null;
        $credits = $creditRow ? (int) $creditRow['balance_after'] : ($sub ? (int) $sub['credits_remaining'] : 0);

        return [
            'id' => $merchant['merchant_id'],
            'name' => $merchant['full_name'],
            'email' => $merchant['email'],
            'businessName' => $brand['name'] ?? '',
            'brandId' => (string) ($brand['brand_id'] ?? ''),
            'hasBrand' => trim((string) ($brand['brand_id'] ?? '')) !== '',
            'role' => $role,
            'isAdmin' => $isAdmin,
            'is_admin' => $isAdmin,
            'planId' => $planId,
            'plan_id' => $planId,
            'planExpiresAt' => $merchant['plan_expires_at'] ?? null,
            'status' => $merchant['status'] ?? 'active',
            'emailVerified' => !empty($merchant['email_verified']),
            'isVerified' => !empty($merchant['email_verified']),
            'credits' => $credits,
            'creditsRemaining' => $sub ? (int) $sub['credits_remaining'] : $credits,
            'subscription' => $sub ? [
                'id' => $sub['subscription_id'],
                'planId' => $sub['plan_id'],
                'status' => $sub['status'],
                'creditsRemaining' => (int) $sub['credits_remaining'],
                'creditsUsed' => (int) $sub['credits_used'],
                'startsAt' => $sub['starts_at'],
                'expiresAt' => $sub['expires_at'],
            ] : null,
            'authProvider' => $merchant['auth_provider'] ?? 'local',
            'avatarUrl' => $merchant['avatar_url'] ?? null,
            'createdAt' => $merchant['created_at'] ?? GpIds::now(),
            'planUsage' => $mid !== '' ? GpPlanLimits::usageForMerchant($mid) : null,
        ];
    }

    public static function method(array $catalog, ?array $row = null, array $ctx = [], ?array $brand = null): array
    {
        $opts = [];
        if ($row && !empty($row['options'])) {
            $decoded = json_decode((string) $row['options'], true);
            $opts = is_array($decoded) ? $decoded : [];
        }
        $enabled = $row !== null && ($row['status'] ?? '') === 'active';
        $plugin = GpCatalog::loadPlugin($catalog['slug'] ?? $catalog['code']);
        $account = $opts['account'] ?? $opts['depositAddressOrNumber'] ?? $opts['mobile_number'] ?? $opts['binance_uid'] ?? $opts['merchant_id'] ?? '';
        $methodCurrency = (string) $catalog['currency'];
        $cryptoQuote = null;
        $cryptoCode = in_array((string) $catalog['code'], ['usdt_trc20', 'binance_pay', 'bybit_pay'], true);
        $fromCur = strtoupper((string) ($ctx['currency'] ?? ''));
        if ($cryptoCode && isset($ctx['amount'], $ctx['brandId']) && in_array($fromCur, ['BDT', 'USD'], true)) {
            $cryptoQuote = GpRatesEngine::usdtQuote((string) $ctx['brandId'], (string) $ctx['amount'], $fromCur);
            $payable = $cryptoQuote['amount'] ?? '';
            if ($cryptoQuote !== null) {
                $methodCurrency = 'USDT';
            }
        } else {
            $payable = isset($ctx['amount'], $ctx['currency'], $ctx['brandId'])
                ? GpRatesEngine::convert((string) $ctx['brandId'], (string) $ctx['amount'], (string) $ctx['currency'], $methodCurrency)
                : '';
        }

        $steps = [];
        $theme = [
            'primary' => '#22D3EE',
            'text' => '#0B1220',
            'button' => '#22D3EE',
            'buttonText' => '#0B1220',
        ];
        $trxHint = 'Paste the transaction ID.';
        $accountLabel = 'Deposit destination';
        if ($plugin) {
            $ins = $plugin->instructions([
                'options' => $opts,
                'transaction' => [
                    'amount' => $payable !== '' ? $payable : '',
                    'currency' => $methodCurrency,
                ],
            ]);
            $steps = is_array($ins) ? $ins : [];
            if (method_exists($plugin, 'theme')) {
                $theme = $plugin->theme();
            }
            $trxHint = $plugin->trxHint();
            $accountLabel = $plugin->accountLabel();
        }
        $stepsText = implode(' ', array_map(static fn ($s) => $s['text'] ?? '', $steps));

        if ($brand === null && isset($ctx['brandId'])) {
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$ctx['brandId']]);
        }
        $ready = GpMethodReadiness::evaluate($catalog, $row, $brand);

        $out = [
            'code' => $catalog['code'],
            'name' => $ready['label'] !== '' ? $ready['label'] : $catalog['title'],
            'country' => $catalog['country'],
            'availability' => $catalog['availability'] ?? 'configuration_required',
            'verificationCapability' => $catalog['verificationCapability'] ?? 'manual_unverified',
            'category' => $catalog['category'],
            'logo' => self::methodLogoPath((string) $catalog['code']),
            'currency' => $methodCurrency,
            'feePercentage' => (float) ($catalog['feePercentage'] ?? 0),
            'fixedFee' => (float) ($catalog['fixedFee'] ?? 0),
            'minAmount' => (float) ($catalog['minAmount'] ?? 0),
            'maxAmount' => (float) ($catalog['maxAmount'] ?? 0),
            'isEnabled' => $enabled,
            'isAutomated' => ($catalog['type'] ?? '') === 'automation',
            'requiresTxidInput' => $catalog['code'] !== 'binance_pay' && (bool) ($catalog['requiresTxidInput'] ?? true),
            'instructions' => $stepsText !== '' ? $stepsText : null,
            'instructionSteps' => $steps,
            'depositAddressOrNumber' => $account !== '' ? (string) $account : null,
            'theme' => $theme,
            'trxHint' => $trxHint,
            'accountLabel' => $accountLabel,
            'releaseScope' => !empty($catalog['releaseScope']),
            'integrationType' => $ready['integrationType'],
            'liveReady' => $ready['liveReady'],
            'readinessReasons' => $ready['reasons'],
        ];
        if ($payable !== '') {
            $out['payableAmount'] = self::num($payable);
            $out['payableCurrency'] = $methodCurrency;
        }
        if (is_array($cryptoQuote)) {
            $out['usdt_amount'] = self::num($cryptoQuote['amount']);
            $out['exchange_rate'] = self::num($cryptoQuote['rate']);
        }
        return $out;
    }

    public static function transaction(array $row, ?array $brand = null, ?array $merchant = null): array
    {
        $customer = json_decode((string) ($row['customer_json'] ?? '{}'), true) ?: [];
        $meta = json_decode((string) ($row['metadata'] ?? '{}'), true);
        $code = GpCatalog::publicCode((string) ($row['method_code'] ?? ''));
        $cat = $code !== '' ? GpCatalog::find($code) : null;
        $amount = self::num($row['amount']);
        $fee = self::num($row['fee'] ?? 0);
        $status = self::status((string) $row['status']);
        $source = (string) ($row['source'] ?? '');
        $sourceId = $row['source_id'] ?? null;

        return [
            'id' => $row['session_id'],
            'timeline' => self::paymentTimeline($row),
            'invoiceId' => $source === 'invoice' ? $sourceId : null,
            'paymentLinkId' => $source === 'payment-link' ? $sourceId : null,
            'merchantId' => $merchant['merchant_id'] ?? ($brand['merchant_id'] ?? ''),
            'merchantName' => $brand['name'] ?? '',
            'customerName' => $customer['name'] ?? null,
            'customerEmail' => $customer['email'] ?? null,
            'customerPhone' => $customer['mobile'] ?? null,
            'amount' => $amount,
            'currency' => $row['currency'],
            'fee' => $fee,
            'netAmount' => round($amount + $fee, 2),
            'paymentMethod' => $code,
            'paymentMethodTitle' => $cat['title'] ?? $code,
            'senderAccountOrAddress' => $customer['mobile'] ?? null,
            'txid' => ($row['trx_id'] ?? null) ?: null,
            'status' => $status,
            'ledgerMode' => strtolower((string) ($row['ledger_mode'] ?? 'live')) === 'test' ? 'test' : 'live',
            'confirmationState' => is_array($meta) ? (string) ($meta['confirmationState'] ?? 'none') : 'none',
            'metadata' => is_array($meta) ? $meta : new \stdClass(),
            'createdAt' => $row['created_at'],
            'completedAt' => $status === 'COMPLETED' ? ($row['updated_at'] ?? null) : null,
        ];
    }

    public static function paymentTimeline(array $row): array
    {
        $meta = json_decode((string) ($row['metadata'] ?? '{}'), true) ?: [];
        $events = [['id' => 'created', 'title' => 'Checkout created', 'timestamp' => $row['created_at'], 'status' => 'completed']];
        if (!empty($row['trx_id'])) {
            $events[] = ['id' => 'txid', 'title' => 'Transaction ID recorded', 'timestamp' => $meta['submittedAt'] ?? null, 'status' => 'completed',
                'description' => 'An ID is a claim; verification requires matching evidence.'];
        }
        $sms = empty($meta['smsId']) ? null : GpDb::one('SELECT received_at, device_id FROM gp_sms_data WHERE id = ? AND brand_id = ?', [$meta['smsId'], $row['brand_id']]);
        if ($sms) {
            $events[] = ['id' => 'sms', 'title' => 'Companion SMS matched', 'timestamp' => $sms['received_at'], 'status' => 'completed'];
            $device = GpDb::one('SELECT last_seen_at FROM gp_devices WHERE device_id = ? AND brand_id = ?', [$sms['device_id'], $row['brand_id']]);
            if (!empty($device['last_seen_at'])) $events[] = ['id' => 'device', 'title' => 'Matched device last sync', 'timestamp' => $device['last_seen_at'], 'status' => 'completed'];
        }
        if (!empty($row['verified_at'])) $events[] = ['id' => 'verified', 'title' => 'Payment decision recorded', 'timestamp' => $row['verified_at'], 'status' => 'completed', 'description' => (string) ($row['evidence_type'] ?? '')];
        $delivery = GpDb::one('SELECT status, http_code, updated_at FROM gp_webhook_deliveries WHERE session_id = ? AND brand_id = ? ORDER BY id DESC LIMIT 1', [$row['session_id'], $row['brand_id']]);
        if ($delivery) $events[] = ['id' => 'webhook', 'title' => 'Latest webhook attempt', 'timestamp' => $delivery['updated_at'], 'status' => $delivery['status'] === 'completed' ? 'completed' : 'pending', 'description' => 'HTTP ' . (int) $delivery['http_code'] . '; ' . $delivery['status']];
        $events[] = ['id' => 'next', 'title' => 'Next action', 'status' => 'current', 'description' => match ((string) $row['status']) {
            'completed' => 'Verify payment status on your server before fulfilling the order. Check webhook delivery if your order has not updated.',
            'expired', 'failed' => 'Keep late receipts for reconciliation. Create a new checkout only after reviewing any payment already sent.',
            default => empty($row['trx_id']) ? 'Ask the buyer for the payment TxID and confirm the paired device is online.' : 'Check the bound device and receiving wallet. Await matching SMS evidence; do not fulfill yet.',
        }];
        return $events;
    }

    public static function checkoutStatus(array $row): array
    {
        $status = self::status((string) $row['status']);
        if (!empty($row['expires_at']) && strtotime((string) $row['expires_at']) < time() && $status === 'PENDING') {
            $status = 'EXPIRED';
        }
        $meta = [];
        if (!empty($row['metadata'])) {
            $decoded = is_array($row['metadata']) ? $row['metadata'] : json_decode((string) $row['metadata'], true);
            $meta = is_array($decoded) ? $decoded : [];
        }
        $confirmationState = (string) ($meta['confirmationState'] ?? 'none');
        if ($status === 'COMPLETED' && $confirmationState === 'none') {
            $confirmationState = 'completed';
        }
        if ($status === 'PENDING' && !empty($row['trx_id']) && $confirmationState === 'none') {
            $confirmationState = 'submitted';
        }
        $message = match ($confirmationState) {
            'verifying' => 'Verifying your Transaction ID automatically... Please wait',
            'submitted' => 'Verifying your Transaction ID automatically... Please wait',
            'matched' => 'Payment matched via companion SMS evidence.',
            'simulated' => 'Sandbox simulation — test ledger only.',
            'merchant_confirmed' => 'Marked paid after merchant review.',
            'provider_confirmed' => 'Confirmed by payment provider.',
            'completed' => 'Payment completed.',
            default => null,
        };
        if ($message === null) {
            $message = match ($status) {
                'EXPIRED' => 'This payment window has ended. Ask the seller for a new checkout before sending money again.',
                'FAILED' => 'This checkout was canceled or failed. Contact the seller with your session id before paying again.',
                'REFUNDED' => 'This payment was refunded by the merchant. Contact them before sending another payment.',
                'PENDING' => empty($row['trx_id'])
                    ? 'Waiting for payment evidence. Pay the shown wallet, then submit your Transaction ID.'
                    : 'Transaction ID received. Waiting for matching companion SMS or provider confirmation — do not pay twice.',
                default => null,
            };
        }
        $returnUrl = isset($meta['returnUrl']) && is_string($meta['returnUrl']) ? $meta['returnUrl'] : null;
        $redirectUrl = null;
        if ($status === 'COMPLETED' && $returnUrl) {
            $sep = str_contains($returnUrl, '?') ? '&' : '?';
            // Never append empty order_id= — it overwrites WooCommerce's order_id query param.
            $qs = [
                'session_id' => $row['session_id'],
                'status' => 'completed',
            ];
            $merchantOrderId = trim((string) ($meta['orderId'] ?? $meta['order_id'] ?? ''));
            if ($merchantOrderId !== '') {
                $qs['order_id'] = $merchantOrderId;
            }
            $trxId = trim((string) ($row['trx_id'] ?? ''));
            if ($trxId !== '') {
                $qs['trx_id'] = $trxId;
            }
            $redirectUrl = $returnUrl . $sep . http_build_query($qs);
        }
        return [
            'sessionId' => $row['session_id'],
            'status' => $status,
            'amount' => self::num($row['amount']),
            'currency' => $row['currency'],
            'paymentMethod' => $row['method_code'] ? GpCatalog::publicCode((string) $row['method_code']) : null,
            'txid' => ($row['trx_id'] ?? null) ?: null,
            'redirectUrl' => $redirectUrl,
            'returnUrl' => $returnUrl,
            'order_id' => (string) ($meta['orderId'] ?? $meta['order_id'] ?? ''),
            'metadata' => $meta !== [] ? $meta : new \stdClass(),
            'paidAt' => $status === 'COMPLETED' ? ($row['updated_at'] ?? null) : null,
            'paid_at' => $status === 'COMPLETED' ? ($row['updated_at'] ?? null) : null,
            'ledgerMode' => strtolower((string) ($row['ledger_mode'] ?? 'live')) === 'test' ? 'test' : 'live',
            'confirmationState' => $confirmationState,
            'message' => $message,
        ];
    }

    public static function paymentLink(array $row, array $brand, array $merchant, array $extra = []): array
    {
        $app = rtrim(GpConfig::get('PUBLIC_APP_URL', GpConfig::get('APP_URL', '')), '/');
        $paid = (int) ($extra['paymentsCount'] ?? 0);
        $collected = self::num($extra['totalCollected'] ?? 0);
        $allowed = $extra['allowedMethods'] ?? array_column(GpCatalog::methods(), 'code');
        return [
            'id' => $row['link_id'],
            'merchantId' => $merchant['merchant_id'],
            'title' => $row['title'],
            'description' => $row['description'] ?? '',
            'amount' => self::num($row['amount']),
            'currency' => $row['currency'],
            'type' => 'reusable',
            'allowedMethods' => $allowed,
            'redirectUrl' => $row['success_redirect_url'] ?? null,
            'successRedirectUrl' => $row['success_redirect_url'] ?? null,
            'productImageUrl' => $row['product_image_url'] ?? null,
            'customFields' => PaymentLinksController::decodeCustomFieldsJson(
                isset($row['custom_fields_json']) ? (string) $row['custom_fields_json'] : null
            ),
            'webhookUrl' => $row['webhook_url'] ?? $brand['webhook_url'] ?? null,
            'isActive' => ($row['status'] ?? '') === 'active',
            'viewsCount' => (int) ($extra['viewsCount'] ?? 0),
            'paymentsCount' => $paid,
            'totalCollected' => $collected,
            'createdAt' => $row['created_at'],
            'payUrl' => ($app !== '' ? $app : '') . '/pay/' . $row['link_id'],
        ];
    }

    public static function invoice(array $row, array $brand, array $merchant): array
    {
        $app = rtrim(GpConfig::get('PUBLIC_APP_URL', GpConfig::get('APP_URL', '')), '/');
        $total = self::num($row['amount']);
        $uiStatus = self::status((string) $row['status']);
        if ($uiStatus === 'COMPLETED') {
            $uiStatus = 'PAID';
        }
        if ($uiStatus === 'PENDING') {
            $uiStatus = 'SENT';
        }
        return [
            'id' => $row['invoice_id'],
            'invoiceNumber' => $row['invoice_id'],
            'merchantId' => $merchant['merchant_id'],
            'merchantName' => $brand['name'] ?? '',
            'clientName' => $row['customer_name'] ?? '',
            'clientEmail' => $row['customer_email'] ?? '',
            'items' => [[
                'id' => $row['invoice_id'] . '-1',
                'description' => $row['note'] ?: 'Invoice',
                'quantity' => 1,
                'unitPrice' => $total,
                'total' => $total,
            ]],
            'subtotal' => $total,
            'tax' => 0,
            'discount' => 0,
            'total' => $total,
            'currency' => $row['currency'],
            'status' => $uiStatus,
            'dueDate' => $row['due_at'] ?: $row['created_at'],
            'paidAt' => $uiStatus === 'PAID' ? ($row['updated_at'] ?? null) : null,
            'createdAt' => $row['created_at'],
            'payUrl' => ($app !== '' ? $app : '') . '/pay/' . $row['invoice_id'],
        ];
    }

    public static function checkoutSession(array $txn, array $link, array $brand, array $methods): array
    {
        $usd = 1.0;
        $rates = GpRatesEngine::usdMap($brand['brand_id']);
        $cur = (string) $txn['currency'];
        if ($cur !== 'USD' && isset($rates[$cur]) && $rates[$cur] > 0) {
            $usd = round(1 / $rates[$cur], 6);
        }
        $meta = [];
        if (!empty($txn['metadata'])) {
            $decoded = is_array($txn['metadata']) ? $txn['metadata'] : json_decode((string) $txn['metadata'], true);
            $meta = is_array($decoded) ? $decoded : [];
        }
        // Hosted checkout lives on the public website host (not the API-only host).
        $app = rtrim(GpConfig::get('PUBLIC_APP_URL', GpConfig::get('APP_URL', '')), '/');
        $payUrl = ($app !== '' ? $app : '') . '/pay/' . $txn['session_id'];
        $returnUrl = isset($meta['returnUrl']) && is_string($meta['returnUrl']) ? $meta['returnUrl'] : null;
        $productImage = isset($meta['productImageUrl']) && is_string($meta['productImageUrl'])
            ? $meta['productImageUrl']
            : (isset($link['product_image_url']) ? (string) $link['product_image_url'] : null);
        $customFields = $meta['customFields'] ?? PaymentLinksController::decodeCustomFieldsJson(
            isset($link['custom_fields_json']) ? (string) $link['custom_fields_json'] : null
        );
        if (!is_array($customFields)) {
            $customFields = [];
        }
        return [
            'status' => true,
            'paymentStatus' => self::status((string) $txn['status']),
            'submittedMethod' => $txn['method_code'] ?? null,
            'submittedGateway' => $txn['gateway_id'] ?? null,
            'submittedTxid' => $txn['trx_id'] ?? null,
            'awaitingEvidence' => strtolower((string) $txn['status']) === 'pending',
            'settledAmount' => isset($txn['verified_amount']) ? self::num($txn['verified_amount']) : null,
            'settledCurrency' => $txn['verified_currency'] ?? null,
            'sessionId' => $txn['session_id'],
            'session_id' => $txn['session_id'],
            'linkId' => $link['link_id'] ?? $txn['session_id'],
            'payUrl' => $payUrl,
            'payment_url' => $payUrl,
            'returnUrl' => $returnUrl,
            'successRedirectUrl' => $returnUrl,
            'productImageUrl' => $productImage !== '' ? $productImage : null,
            'customFields' => $customFields,
            'merchantName' => $brand['name'] ?? 'GressPay Merchant',
            'merchantLogo' => self::merchantLogoForBrand($brand),
            'merchantVerified' => false,
            'websiteUrl' => trim((string) ($brand['website_url'] ?? '')) ?: null,
            'supportMobile' => trim((string) ($brand['support_mobile'] ?? '')) ?: null,
            'supportWhatsapp' => trim((string) ($brand['support_whatsapp'] ?? '')) ?: null,
            'supportEmail' => trim((string) ($brand['support_email'] ?? '')) ?: null,
            'supportTelegram' => trim((string) ($brand['support_telegram'] ?? '')) ?: null,
            'checkoutTheme' => (string) ($brand['checkout_theme'] ?? 'default') ?: 'default',
            'verificationMode' => GpConfig::get('GRESSPAY_SMS_AUTO_ALLOWED', '0') === '1'
                ? ((string) ($brand['verification_mode'] ?? 'trx_id') ?: 'trx_id') : 'trx_id',
            'amountPolicy' => (string) ($brand['amount_policy'] ?? 'exact') ?: 'exact',
            'amountFormat' => (string) ($brand['amount_format'] ?? 'as_is') ?: 'as_is',
            'brandFee' => isset($brand['brand_fee']) ? self::num($brand['brand_fee']) : 0,
            'brandFeeType' => (string) ($brand['brand_fee_type'] ?? 'fixed') ?: 'fixed',
            'orderTitle' => $meta['orderTitle'] ?? ($link['title'] ?? 'Payment'),
            'orderDescription' => $meta['orderDescription'] ?? ($link['description'] ?? ''),
            'amount' => self::num($txn['amount']),
            'currency' => $txn['currency'],
            'exchangeRateToUsd' => $usd,
            'availableMethods' => $methods,
            'ledgerMode' => strtolower((string) ($txn['ledger_mode'] ?? 'live')) === 'test' ? 'test' : 'live',
            'expiresAt' => $txn['expires_at'],
            'createdAt' => $txn['created_at'],
        ];
    }

    public static function webhookPayload(array $txn, array $brand, ?array $link = null): array
    {
        $code = GpCatalog::publicCode((string) ($txn['method_code'] ?? ''));
        $paidCur = $txn['local_currency'] ?: $txn['currency'];
        $paidAmt = $txn['local_net'] !== null && $txn['local_net'] !== '' ? $txn['local_net'] : $txn['amount'];
        return [
            'event' => 'payment.completed',
            'transactionId' => $txn['session_id'],
            'paymentLinkId' => ($txn['source'] ?? '') === 'payment-link' ? $txn['source_id'] : null,
            'orderTitle' => $link['title'] ?? 'Payment',
            'amount' => self::num($txn['amount']),
            'currency' => $txn['currency'],
            'paidAmount' => self::num($paidAmt),
            'paidCurrency' => $paidCur,
            'paymentMethod' => $code,
            'txid' => $txn['trx_id'] ?? '',
            'status' => 'COMPLETED',
            'timestamp' => $txn['updated_at'] ?? GpIds::now(),
        ];
    }

    public static function ratesMap(array $rows): array
    {
        $out = [
            'USD' => 1.0,
            'USDT' => 1.0,
            'BDT' => 122.5,
            'INR' => 88.4,
            'PKR' => 284.1,
            'NPR' => 141.2,
            'EUR' => 0.92,
        ];
        $updated = GpIds::now();
        foreach ($rows as $row) {
            $out[$row['code']] = self::num($row['rate']);
            $updated = $row['updated_at'] ?? $updated;
        }
        return [
            'base' => 'USD',
            'updatedAt' => $updated,
            'rates' => [
                'USD' => (float) ($out['USD'] ?? 1),
                'USDT' => (float) ($out['USDT'] ?? 1),
                'BDT' => (float) ($out['BDT'] ?? 122.5),
                'INR' => (float) ($out['INR'] ?? 88.4),
                'PKR' => (float) ($out['PKR'] ?? 284.1),
                'NPR' => (float) ($out['NPR'] ?? 141.2),
                'EUR' => (float) ($out['EUR'] ?? 0.92),
            ],
        ];
    }

    /** @param array<string,mixed> $brand */
    private static function merchantLogoForBrand(array $brand): ?string
    {
        try {
            $objectKey = trim((string) ($brand['logo_object_key'] ?? ''));
            if ($objectKey !== '' && R2Client::isConfigured()) {
                try {
                    return R2Client::presignGet($objectKey, min(3600, max(900, GpConfig::r2PresignTtl())));
                } catch (Throwable $e) {
                    // fall through
                }
            }
            $brandUrl = trim((string) ($brand['logo_url'] ?? ''));
            if ($brandUrl !== '' && (str_starts_with(strtolower($brandUrl), 'https://') || str_starts_with(strtolower($brandUrl), 'http://') || str_starts_with(strtolower($brandUrl), 'data:image/'))) {
                return $brandUrl;
            }
            return null;
        } catch (Throwable $e) {
            return null;
        }
    }
}
