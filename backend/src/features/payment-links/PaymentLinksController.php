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
            GpAuth::requireScope($actor, 'manage_links');
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
            $successRedirect = trim((string) $req->input('successRedirectUrl', $req->input('success_redirect_url', '')));
            if ($successRedirect !== '') {
                $rd = GpWebhook::validateDestination($successRedirect);
                if (!$rd['ok']) {
                    GpJson::error('INVALID_URL', 'successRedirectUrl rejected (' . ($rd['error'] ?? 'unsafe') . ').', 400);
                }
            }
            $productImage = trim((string) $req->input('productImageUrl', $req->input('product_image_url', '')));
            if ($productImage !== '') {
                if (!filter_var($productImage, FILTER_VALIDATE_URL) || !str_starts_with(strtolower($productImage), 'https://')) {
                    GpJson::error('INVALID_URL', 'productImageUrl must be a valid HTTPS URL.', 400);
                }
            }
            $customFields = self::normalizeCustomFields($req->input('customFields', $req->input('custom_fields', [])));
            $customJson = $customFields !== [] ? json_encode($customFields, JSON_UNESCAPED_UNICODE) : null;

            $ledgerMode = $actor['mode'] === 'test' ? 'test' : 'live';
            GpDb::exec(
                'INSERT INTO gp_payment_links (link_id, brand_id, title, amount, currency, status, description, webhook_url, ledger_mode, success_redirect_url, product_image_url, custom_fields_json, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $linkId,
                    $actor['brand_id'],
                    $title,
                    $amount,
                    $currency,
                    'active',
                    $description,
                    $webhook !== '' ? $webhook : null,
                    $ledgerMode,
                    $successRedirect !== '' ? $successRedirect : null,
                    $productImage !== '' ? $productImage : null,
                    $customJson,
                    $now,
                    $now,
                ]
            );
            $row = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$linkId]);
            GpJson::send(['link' => self::present($row, $brand, $merchant)], 201);
        }
        GpJson::error('METHOD_NOT_ALLOWED', 'Unsupported method.', 405);
    }

    /**
     * @return list<array{id:string,label:string,required:bool,type:string}>
     */
    public static function normalizeCustomFields(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        $i = 0;
        foreach ($raw as $field) {
            if (!is_array($field)) {
                continue;
            }
            $label = trim((string) ($field['label'] ?? $field['name'] ?? ''));
            if ($label === '' || strlen($label) > 80) {
                continue;
            }
            $type = strtolower(trim((string) ($field['type'] ?? 'text')));
            if (!in_array($type, ['text', 'email', 'phone'], true)) {
                $type = 'text';
            }
            $id = trim((string) ($field['id'] ?? 'field_' . (++$i)));
            if ($id === '' || strlen($id) > 40) {
                $id = 'field_' . $i;
            }
            $out[] = [
                'id' => preg_replace('/[^a-z0-9_\-]/i', '', $id) ?: ('field_' . $i),
                'label' => $label,
                'required' => !empty($field['required']),
                'type' => $type,
            ];
            if (count($out) >= 8) {
                break;
            }
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $meta Session metadata (must include customFields list).
     * @return array<string,mixed> Updated metadata with customFieldResponses.
     */
    public static function mergeCustomFieldResponses(array $meta, GpRequest $req): array
    {
        $fields = $meta['customFields'] ?? [];
        if (!is_array($fields) || $fields === []) {
            return $meta;
        }
        $raw = $req->input('customFields', $req->input('custom_field_responses', []));
        if (!is_array($raw)) {
            $raw = [];
        }
        $responses = [];
        foreach ($fields as $field) {
            if (!is_array($field)) {
                continue;
            }
            $id = (string) ($field['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $val = trim((string) ($raw[$id] ?? ''));
            $required = !empty($field['required']);
            if ($required && $val === '') {
                GpJson::error('VALIDATION', 'Required field missing: ' . ($field['label'] ?? $id), 400);
            }
            if ($val === '') {
                continue;
            }
            $type = (string) ($field['type'] ?? 'text');
            if ($type === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                GpJson::error('VALIDATION', 'Invalid email for ' . ($field['label'] ?? $id), 400);
            }
            if ($type === 'phone' && !preg_match('/^01[0-9]{9}$/', preg_replace('/\D/', '', $val))) {
                GpJson::error('VALIDATION', 'Invalid phone for ' . ($field['label'] ?? $id), 400);
            }
            if (strlen($val) > 200) {
                GpJson::error('VALIDATION', 'Field too long: ' . ($field['label'] ?? $id), 400);
            }
            $responses[$id] = $val;
        }
        if ($responses !== []) {
            $meta['customFieldResponses'] = $responses;
        }
        return $meta;
    }

    /** @return list<array{id:string,label:string,required:bool,type:string}> */
    public static function decodeCustomFieldsJson(?string $json): array
    {
        if ($json === null || trim($json) === '') {
            return [];
        }
        $decoded = json_decode($json, true);
        return is_array($decoded) ? self::normalizeCustomFields($decoded) : [];
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
