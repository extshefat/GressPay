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
            'upay' => 'upay.png',
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
        $isAdmin = GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin');
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
            'isVerified' => ($merchant['status'] ?? '') === 'active',
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
        $returnUrl = isset($meta['returnUrl']) && is_string($meta['returnUrl']) ? $meta['returnUrl'] : null;
        $redirectUrl = null;
        if ($status === 'COMPLETED' && $returnUrl) {
            $sep = str_contains($returnUrl, '?') ? '&' : '?';
            $redirectUrl = $returnUrl . $sep . http_build_query([
                'session_id' => $row['session_id'],
                'order_id' => (string) ($meta['orderId'] ?? ''),
                'status' => 'completed',
                'trx_id' => (string) ($row['trx_id'] ?? ''),
            ]);
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
            'merchantVerified' => true,
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
        $merchantId = (string) ($brand['merchant_id'] ?? '');
        if ($merchantId === '') {
            return null;
        }
        try {
            $m = GpDb::one('SELECT brand_logo_url, brand_name FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
            $logo = trim((string) ($m['brand_logo_url'] ?? ''));
            return $logo !== '' ? $logo : null;
        } catch (Throwable $e) {
            return null;
        }
    }
}
