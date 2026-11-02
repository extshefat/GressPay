<?php
declare(strict_types=1);

final class BrandsController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireDashboardUser($req);
        $id = $req->part(1);
        $action = $req->part(2);

        if ($req->method === 'GET' && $id === null) {
            self::list($actor);
        }
        if ($req->method === 'POST' && $id === null) {
            self::create($actor, $req);
        }
        if ($req->method === 'POST' && $id !== null && $action === 'switch') {
            self::switchBrand($actor, $id);
        }
        if ($req->method === 'POST' && $id !== null && $action === 'rotate-website-key') {
            self::rotateWebsiteKey($actor, $id);
        }
        if ($req->method === 'PUT' && $id !== null && $action === null) {
            self::update($actor, $id, $req);
        }
        $sub = $req->part(3);
        if ($id !== null && $action === 'logo') {
            $brand = GpDb::one(
                'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$id, $actor['merchant_id']]
            );
            GpTeam::requireCan($actor, 'brands', $req->method === 'GET' ? 'view' : 'edit');
            if ($brand === null || !GpTeam::actorCanAccessBrand($actor, $brand)) {
                GpJson::error('NOT_FOUND', 'Brand not found.', 404);
            }
            if ($sub === 'upload-intent' && $req->method === 'POST') {
                self::logoUploadIntent($actor, $brand, $req);
            }
            if ($sub === 'direct' && $req->method === 'POST') {
                self::logoDirectUpload($actor, $brand, $req);
            }
            if ($sub === 'complete' && $req->method === 'POST') {
                self::logoUploadComplete($actor, $brand, $req);
            }
            if (($sub === null || $sub === '') && $req->method === 'DELETE') {
                self::logoDelete($actor, $brand);
            }
            if ($sub === 'preview' && $req->method === 'GET') {
                self::logoPreview($brand);
            }
        }
        GpJson::error('NOT_FOUND', 'Unknown brands route.', 404);
    }

    /** @param array<string,mixed> $actor */
    private static function isWorkspaceOwner(array $actor): bool
    {
        return empty($actor['team_member_id']);
    }

    /** JWT subject stays the signed-in user (staff), not the workspace owner. */
    private static function jwtSubject(array $actor): string
    {
        $staff = trim((string) ($actor['staff_user_merchant_id'] ?? ''));
        return $staff !== '' ? $staff : (string) $actor['merchant_id'];
    }

    /** @param array<string,mixed> $actor */
    private static function list(array $actor): never
    {
        GpTeam::requireCan($actor, 'brands', 'view');
        $rows = GpDb::all(
            'SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC',
            [$actor['merchant_id']]
        );
        $allowed = $actor['allowed_brand_ids'] ?? null;
        $isStaff = !self::isWorkspaceOwner($actor);
        $out = [];
        foreach ($rows as $row) {
            $brandId = (string) $row['brand_id'];
            if ($isStaff && is_array($allowed) && !in_array($brandId, $allowed, true)) {
                continue;
            }
            $deviceCount = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = 'active'",
                [$brandId]
            )['c'] ?? 0);
            $gwCount = (int) (GpDb::one(
                'SELECT COUNT(*) AS c FROM gp_gateways WHERE brand_id = ?',
                [$brandId]
            )['c'] ?? 0);
            $liveKey = GpDb::one(
                "SELECT prefix, key_sealed FROM gp_api_keys WHERE brand_id = ? AND mode = 'live' AND status = 'active' ORDER BY id DESC LIMIT 1",
                [$brandId]
            );
            $websitePlain = '';
            // Website API keys remain owner-only; staff never receive plaintext.
            if (!$isStaff && is_array($liveKey) && !empty($liveKey['key_sealed'])) {
                $websitePlain = GpCrypto::open((string) $liveKey['key_sealed']) ?? '';
            }
            $logoKey = trim((string) ($row['logo_object_key'] ?? ''));
            $logoUrl = trim((string) ($row['logo_url'] ?? ''));
            $previewLogo = $logoUrl !== '' ? $logoUrl : null;
            if ($previewLogo === null && $logoKey !== '' && R2Client::isConfigured()) {
                try {
                    $previewLogo = R2Client::presignGet($logoKey, min(3600, max(900, GpConfig::r2PresignTtl())));
                } catch (Throwable $e) {
                    $previewLogo = null;
                }
            }
            $hasKey = $websitePlain !== '' || (is_array($liveKey) && ($liveKey['prefix'] ?? '') !== '');
            $out[] = array_merge(self::presentBrandSettings($row), [
                'brandId' => $brandId,
                'name' => $row['name'],
                'currencyCode' => $row['currency_code'] ?? 'BDT',
                'timezone' => $row['timezone'] ?? 'Asia/Dhaka',
                'webhookUrl' => $row['webhook_url'] ?? null,
                'active' => $brandId === $actor['brand_id'],
                'deviceCount' => $deviceCount,
                'gatewayCount' => $gwCount,
                'logoConfigured' => $logoKey !== '' || $logoUrl !== '',
                'logoUrl' => $previewLogo,
                'websiteApiKey' => $websitePlain,
                'websiteApiKeyMasked' => $hasKey ? '**********' : '—',
                'websiteApiKeyCopyable' => $websitePlain !== '',
                'createdAt' => $row['created_at'] ?? null,
            ]);
        }
        GpJson::send([
            'brands' => $out,
            'activeBrandId' => $actor['brand_id'],
            'isWorkspaceOwner' => !$isStaff,
            'teamRole' => $actor['team_role'] ?? null,
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function create(array $actor, GpRequest $req): never
    {
        if (!self::isWorkspaceOwner($actor)) {
            GpJson::error('FORBIDDEN', 'Only the workspace owner can create brands.', 403);
        }
        GpTeam::requireCan($actor, 'brands', 'create');
        GpPlanLimits::assertBrandCreateAllowed((string) $actor['merchant_id']);

        $name = trim((string) $req->input('name', $req->input('brand_name', '')));
        if ($name === '') {
            GpJson::error('MISSING_FIELD', 'Brand name is required.');
        }
        $brandId = GpIds::make('brd', 8);
        $now = GpIds::now();
        $webhookSecret = 'gpwh_' . bin2hex(random_bytes(24));
        GpDb::exec(
            'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, webhook_secret, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $brandId,
                $actor['merchant_id'],
                $name,
                strtoupper((string) $req->input('currency_code', 'BDT')),
                (string) $req->input('timezone', 'Asia/Dhaka'),
                GpCrypto::seal($webhookSecret),
                $now,
                $now,
            ]
        );
        GpAuth::seedCurrencies($brandId);
        foreach (GpCatalog::releaseMethods() as $m) {
            GpDb::exec(
                'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [$brandId, $m['code'], 'inactive', '{}', $now, $now]
            );
        }
        GpAuth::issueKey($brandId, 'live', 'Website API key');
        GpAuth::issueKey($brandId, 'test', 'Default test');

        $subject = self::jwtSubject($actor);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$subject]);
        $token = GpJwt::encode([
            'sub' => $subject,
            'brand' => $brandId,
            'email' => $merchant['email'] ?? $actor['email'],
            'role' => $actor['role'] ?? 'merchant',
            'is_admin' => !empty($actor['is_admin']),
            'plan_id' => $actor['plan_id'] ?? 'starter',
        ]);
        GpJson::send([
            'brand' => [
                'brandId' => $brandId,
                'name' => $name,
                'active' => true,
            ],
            'token' => $token,
            'note' => 'Brand created. Use the returned token (or X-GressPay-Brand) for subsequent calls.',
        ], 201);
    }

    /** @param array<string,mixed> $actor */
    private static function rotateWebsiteKey(array $actor, string $brandId): never
    {
        if (!self::isWorkspaceOwner($actor)) {
            GpJson::error('FORBIDDEN', 'Only the workspace owner can rotate website API keys.', 403);
        }
        $brand = GpDb::one(
            'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
            [$brandId, $actor['merchant_id']]
        );
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found for your account.', 404);
        }
        GpDb::exec(
            'UPDATE gp_api_keys SET status = ?, updated_at = ? WHERE brand_id = ? AND mode = ? AND status = ?',
            ['inactive', GpIds::now(), $brandId, 'live', 'active']
        );
        $issued = GpAuth::issueKey($brandId, 'live', 'Website API key (rotated)');
        GpJson::send([
            'brandId' => $brandId,
            'websiteApiKey' => $issued['key'],
            'note' => 'New website API key issued. Copy anytime from the Brands table.',
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function switchBrand(array $actor, string $brandId): never
    {
        $brand = GpDb::one(
            'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
            [$brandId, $actor['merchant_id']]
        );
        if ($brand === null || !GpTeam::actorCanAccessBrand($actor, $brand)) {
            GpJson::error('NOT_FOUND', 'Brand not found for your account.', 404);
        }
        $subject = self::jwtSubject($actor);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$subject]);
        $existingExp = isset($actor['exp']) ? (int) $actor['exp'] : 0;
        $remaining = $existingExp - time();
        $ttl = ($remaining > GpJwt::TTL_DEFAULT) ? $remaining : GpJwt::TTL_DEFAULT;
        $token = GpJwt::encode([
            'sub' => $subject,
            'brand' => $brand['brand_id'],
            'email' => $merchant['email'] ?? $actor['email'],
            'role' => $actor['role'] ?? 'merchant',
            'is_admin' => !empty($actor['is_admin']),
            'plan_id' => $actor['plan_id'] ?? 'starter',
        ], $ttl);
        GpJson::send([
            'brandId' => $brand['brand_id'],
            'name' => $brand['name'],
            'token' => $token,
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function update(array $actor, string $brandId, GpRequest $req): never
    {
        if (!self::isWorkspaceOwner($actor)) {
            GpJson::error('FORBIDDEN', 'Only the workspace owner can edit brand settings.', 403);
        }
        GpTeam::requireCan($actor, 'brands', 'edit');
        $brand = GpDb::one(
            'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
            [$brandId, $actor['merchant_id']]
        );
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        $name = trim((string) $req->input('name', $brand['name']));
        if ($name === '' || strlen($name) > 120) {
            GpJson::error('INVALID_NAME', 'Brand name is required (max 120 chars).', 400);
        }
        $webhookUrl = trim((string) $req->input('webhook_url', $req->input('webhookUrl', $brand['webhook_url'] ?? '')));
        if ($webhookUrl !== '') {
            $wh = GpWebhook::validateDestination($webhookUrl);
            if (!$wh['ok']) {
                GpJson::error('INVALID_URL', 'webhook_url rejected (' . ($wh['error'] ?? 'unsafe') . ').', 400);
            }
        }

        $websiteUrl = trim((string) $req->input('websiteUrl', $req->input('website_url', $brand['website_url'] ?? '')));
        if ($websiteUrl !== '' && !preg_match('#^https?://#i', $websiteUrl)) {
            GpJson::error('INVALID_URL', 'websiteUrl must start with http:// or https://.', 400);
        }

        $supportMobile = self::clip(trim((string) $req->input('supportMobile', $req->input('support_mobile', $brand['support_mobile'] ?? ''))), 40);
        $supportWhatsapp = self::clip(trim((string) $req->input('supportWhatsapp', $req->input('support_whatsapp', $brand['support_whatsapp'] ?? ''))), 40);
        $supportEmail = self::clip(trim((string) $req->input('supportEmail', $req->input('support_email', $brand['support_email'] ?? ''))), 160);
        $supportTelegram = self::clip(trim((string) $req->input('supportTelegram', $req->input('support_telegram', $brand['support_telegram'] ?? ''))), 80);
        if ($supportEmail !== '' && !filter_var($supportEmail, FILTER_VALIDATE_EMAIL)) {
            GpJson::error('INVALID_EMAIL', 'supportEmail must be a valid email address.', 400);
        }

        $theme = strtolower(trim((string) $req->input('checkoutTheme', $req->input('checkout_theme', $brand['checkout_theme'] ?? 'default'))));
        if (!in_array($theme, ['default', 'luxury', 'minimal'], true)) {
            GpJson::error('INVALID_THEME', 'checkoutTheme must be default, luxury, or minimal.', 400);
        }
        $status = strtolower(trim((string) $req->input('brandStatus', $req->input('brand_status', $brand['brand_status'] ?? 'active'))));
        if (!in_array($status, ['active', 'inactive'], true)) {
            GpJson::error('INVALID_STATUS', 'brandStatus must be active or inactive.', 400);
        }
        $verifyMode = strtolower(trim((string) $req->input('verificationMode', $req->input('verification_mode', $brand['verification_mode'] ?? 'trx_id'))));
        if (!in_array($verifyMode, ['trx_id', 'sms_auto'], true)) {
            GpJson::error('INVALID_MODE', 'verificationMode must be trx_id or sms_auto.', 400);
        }
        $amountPolicy = strtolower(trim((string) $req->input('amountPolicy', $req->input('amount_policy', $brand['amount_policy'] ?? 'exact'))));
        if (!in_array($amountPolicy, ['exact', 'equal_or_more'], true)) {
            GpJson::error('INVALID_POLICY', 'amountPolicy must be exact or equal_or_more.', 400);
        }
        $amountFormat = strtolower(trim((string) $req->input('amountFormat', $req->input('amount_format', $brand['amount_format'] ?? 'as_is'))));
        if (!in_array($amountFormat, ['as_is', 'floor', 'ceil'], true)) {
            GpJson::error('INVALID_FORMAT', 'amountFormat must be as_is, floor, or ceil.', 400);
        }
        $feeType = strtolower(trim((string) $req->input('brandFeeType', $req->input('brand_fee_type', $brand['brand_fee_type'] ?? 'fixed'))));
        if (!in_array($feeType, ['fixed', 'percentage'], true)) {
            GpJson::error('INVALID_FEE_TYPE', 'brandFeeType must be fixed or percentage.', 400);
        }
        $brandFee = (float) $req->input('brandFee', $req->input('brand_fee', $brand['brand_fee'] ?? 0));
        if ($brandFee < 0 || ($feeType === 'percentage' && $brandFee > 100)) {
            GpJson::error('INVALID_FEE', 'brandFee must be >= 0 (and <= 100 for percentage).', 400);
        }
        $shuffleRaw = $req->input('shuffleDuplicateGateways', $req->input('shuffle_duplicate_gateways', $brand['shuffle_duplicate_gateways'] ?? 0));
        $shuffle = ($shuffleRaw === true || $shuffleRaw === 1 || $shuffleRaw === '1' || $shuffleRaw === 'true') ? 1 : 0;

        // equal_or_more uses a small default tolerance so SMS overpay can still match.
        $tolerance = $amountPolicy === 'equal_or_more'
            ? (string) ($brand['payment_tolerance'] ?? '0.5')
            : (string) ($brand['payment_tolerance'] ?? '0');
        if ($amountPolicy === 'equal_or_more' && (float) $tolerance <= 0) {
            $tolerance = '0.5';
        }

        GpDb::exec(
            'UPDATE gp_brands SET
                name = ?, webhook_url = ?, website_url = ?,
                support_mobile = ?, support_whatsapp = ?, support_email = ?, support_telegram = ?,
                checkout_theme = ?, brand_status = ?, verification_mode = ?,
                amount_policy = ?, amount_format = ?, brand_fee = ?, brand_fee_type = ?,
                shuffle_duplicate_gateways = ?, payment_tolerance = ?, updated_at = ?
             WHERE brand_id = ?',
            [
                $name,
                $webhookUrl !== '' ? $webhookUrl : null,
                $websiteUrl !== '' ? $websiteUrl : null,
                $supportMobile !== '' ? $supportMobile : null,
                $supportWhatsapp !== '' ? $supportWhatsapp : null,
                $supportEmail !== '' ? $supportEmail : null,
                $supportTelegram !== '' ? $supportTelegram : null,
                $theme,
                $status,
                $verifyMode,
                $amountPolicy,
                $amountFormat,
                $brandFee,
                $feeType,
                $shuffle,
                $tolerance,
                GpIds::now(),
                $brandId,
            ]
        );

        $logoUrl = trim((string) $req->input('logoUrl', $req->input('logo_url', $brand['logo_url'] ?? '')));
        if ($req->input('logoUrl', $req->input('logo_url', null)) !== null) {
            if ($logoUrl !== '' && !preg_match('#^(https://|data:image/)#i', $logoUrl)) {
                GpJson::error('INVALID_URL', 'logoUrl must be an HTTPS URL or data:image upload.', 400);
            }
            GpDb::exec(
                'UPDATE gp_brands SET logo_url = ?, logo_object_key = NULL, logo_mime = NULL, updated_at = ? WHERE brand_id = ?',
                [$logoUrl !== '' ? $logoUrl : null, GpIds::now(), $brandId]
            );
        }

        $fresh = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
        GpJson::send([
            'brand' => array_merge([
                'brandId' => $brandId,
                'name' => $name,
                'webhookUrl' => $webhookUrl !== '' ? $webhookUrl : null,
                'logoUrl' => trim((string) ($fresh['logo_url'] ?? '')) ?: null,
            ], self::presentBrandSettings(is_array($fresh) ? $fresh : [])),
        ]);
    }

    /** @param array<string,mixed> $row @return array<string,mixed> */
    public static function presentBrandSettings(array $row): array
    {
        $fee = isset($row['brand_fee']) ? (float) $row['brand_fee'] : 0.0;
        return [
            'websiteUrl' => trim((string) ($row['website_url'] ?? '')) ?: null,
            'supportMobile' => trim((string) ($row['support_mobile'] ?? '')) ?: null,
            'supportWhatsapp' => trim((string) ($row['support_whatsapp'] ?? '')) ?: null,
            'supportEmail' => trim((string) ($row['support_email'] ?? '')) ?: null,
            'supportTelegram' => trim((string) ($row['support_telegram'] ?? '')) ?: null,
            'checkoutTheme' => (string) ($row['checkout_theme'] ?? 'default') ?: 'default',
            'brandStatus' => (string) ($row['brand_status'] ?? 'active') ?: 'active',
            'verificationMode' => (string) ($row['verification_mode'] ?? 'trx_id') ?: 'trx_id',
            'amountPolicy' => (string) ($row['amount_policy'] ?? 'exact') ?: 'exact',
            'amountFormat' => (string) ($row['amount_format'] ?? 'as_is') ?: 'as_is',
            'brandFee' => $fee,
            'brandFeeType' => (string) ($row['brand_fee_type'] ?? 'fixed') ?: 'fixed',
            'shuffleDuplicateGateways' => !empty($row['shuffle_duplicate_gateways']),
        ];
    }

    private static function clip(string $value, int $max): string
    {
        if ($value === '') {
            return '';
        }
        return strlen($value) > $max ? substr($value, 0, $max) : $value;
    }

    /** @param array<string,mixed> $actor @param array<string,mixed> $brand */
    private static function logoUploadIntent(array $actor, array $brand, GpRequest $req): never
    {
        GpRateLimiter::guard('brand-logo:' . $actor['merchant_id'], 20, 60);
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'Logo upload unavailable — platform R2 is not configured.', 503);
        }
        $contentType = strtolower(trim((string) $req->input('contentType', $req->input('mimeType', ''))));
        if (!in_array($contentType, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            GpJson::error('INVALID_MIME', 'Allowed types: image/png, image/jpeg, image/webp.', 400);
        }
        $declaredSize = (int) $req->input('byteSize', $req->input('size', 0));
        $max = min(GpConfig::r2MaxUploadBytes(), 2 * 1024 * 1024);
        if ($declaredSize <= 0 || $declaredSize > $max) {
            GpJson::error('FILE_TOO_LARGE', 'Logo must be between 1 and ' . $max . ' bytes.', 400);
        }
        $ext = R2Client::extensionForMime($contentType);
        $objectKey = sprintf(
            'brands/%s/logo/%s.%s',
            $brand['brand_id'],
            bin2hex(random_bytes(12)),
            $ext
        );
        try {
            $presign = R2Client::presignPut($objectKey, $contentType);
        } catch (Throwable $e) {
            GpJson::error('R2_ERROR', 'Could not create upload URL.', 503);
        }
        GpJson::send([
            'uploadUrl' => $presign['url'],
            'requiredHeaders' => $presign['headers'],
            'objectKey' => $objectKey,
            'expiresIn' => $presign['expiresIn'],
            'maxBytes' => $max,
            'contentType' => $contentType,
        ]);
    }

    /** @param array<string,mixed> $actor @param array<string,mixed> $brand */
    private static function logoUploadComplete(array $actor, array $brand, GpRequest $req): never
    {
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'Logo upload unavailable — platform R2 is not configured.', 503);
        }
        $objectKey = trim((string) $req->input('objectKey', ''));
        $prefix = 'brands/' . $brand['brand_id'] . '/logo/';
        if ($objectKey === '' || !str_starts_with($objectKey, $prefix) || str_contains($objectKey, '..')) {
            GpJson::error('INVALID_KEY', 'objectKey is not valid for this brand.', 400);
        }
        $head = R2Client::headObject($objectKey);
        if (empty($head['ok'])) {
            GpJson::error('OBJECT_MISSING', 'Uploaded object not found in storage. Retry upload.', 400);
        }
        $oldKey = trim((string) ($brand['logo_object_key'] ?? ''));
        $mime = strtolower((string) ($head['contentType'] ?? 'image/png'));
        GpDb::exec(
            'UPDATE gp_brands SET logo_object_key = ?, logo_mime = ?, logo_url = NULL, updated_at = ? WHERE brand_id = ?',
            [$objectKey, $mime, GpIds::now(), $brand['brand_id']]
        );
        if ($oldKey !== '' && $oldKey !== $objectKey) {
            R2Client::deleteObject($oldKey);
        }
        $preview = null;
        try {
            $preview = R2Client::presignGet($objectKey, min(3600, GpConfig::r2PresignTtl()));
        } catch (Throwable $e) {
            $preview = null;
        }
        GpJson::send([
            'ok' => true,
            'brandId' => $brand['brand_id'],
            'logoConfigured' => true,
            'previewUrl' => $preview,
        ]);
    }

    /** @param array<string,mixed> $actor @param array<string,mixed> $brand */
    private static function logoDelete(array $actor, array $brand): never
    {
        $key = trim((string) ($brand['logo_object_key'] ?? ''));
        $now = GpIds::now();
        // Clear R2 key and direct data-URL / HTTP logo so checkout stops showing a stale brand mark.
        GpDb::exec(
            'UPDATE gp_brands SET logo_object_key = NULL, logo_mime = NULL, logo_url = NULL, updated_at = ? WHERE brand_id = ?',
            [$now, $brand['brand_id']]
        );
        if ($key !== '' && R2Client::isConfigured()) {
            R2Client::deleteObject($key);
        }
        GpJson::send(['ok' => true, 'brandId' => $brand['brand_id'], 'logoConfigured' => false]);
    }

    /** @param array<string,mixed> $actor @param array<string,mixed> $brand */
    private static function logoDirectUpload(array $actor, array $brand, GpRequest $req): never
    {
        GpRateLimiter::guard('brand-logo:' . $actor['merchant_id'], 20, 60);
        $dataUrl = trim((string) $req->input('dataUrl', $req->input('data_url', '')));
        if ($dataUrl === '') {
            $logoUrl = trim((string) $req->input('logoUrl', $req->input('logo_url', '')));
            if ($logoUrl === '') {
                GpJson::error('MISSING_DATA', 'dataUrl or logoUrl is required.', 400);
            }
            $dataUrl = $logoUrl;
        }
        if (str_starts_with($dataUrl, 'data:')) {
            if (strlen($dataUrl) > 2800000 || !preg_match('#^data:(image/(?:png|jpeg|webp));base64,(.+)$#sD', $dataUrl, $parts)) {
                GpJson::error('INVALID_LOGO', 'Choose a PNG, JPEG or WebP image under 2 MB.', 400);
            }
            $bytes = base64_decode($parts[2], true);
            $image = $bytes !== false && strlen($bytes) <= 2097152 ? @getimagesizefromstring($bytes) : false;
            if (!$image || $image['mime'] !== $parts[1]) {
                GpJson::error('INVALID_LOGO', 'Invalid logo image.', 400);
            }
        } elseif (!filter_var($dataUrl, FILTER_VALIDATE_URL) || !str_starts_with($dataUrl, 'https://')) {
            GpJson::error('INVALID_LOGO', 'Enter an HTTPS image URL.', 400);
        }
        $now = GpIds::now();
        GpDb::exec(
            'UPDATE gp_brands SET logo_url = ?, logo_object_key = NULL, logo_mime = NULL, updated_at = ? WHERE brand_id = ?',
            [$dataUrl, $now, $brand['brand_id']]
        );
        GpJson::send(['ok' => true, 'brandId' => $brand['brand_id'], 'logoUrl' => $dataUrl]);
    }

    /** @param array<string,mixed> $brand */
    private static function logoPreview(array $brand): never
    {
        $url = trim((string) ($brand['logo_url'] ?? ''));
        if (str_starts_with($url, 'data:image/') || str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            GpJson::send(['url' => $url, 'expiresIn' => 3600]);
        }
        $key = trim((string) ($brand['logo_object_key'] ?? ''));
        if ($key === '') {
            if ($url === '') {
                GpJson::error('NOT_FOUND', 'No logo uploaded for this brand.', 404);
            }
            GpJson::send(['url' => $url, 'expiresIn' => 0]);
        }
        if (!R2Client::isConfigured()) {
            if ($url !== '') {
                GpJson::send(['url' => $url, 'expiresIn' => 0]);
            }
            GpJson::error('R2_UNAVAILABLE', 'Logo preview unavailable.', 503);
        }
        try {
            $ttl = min(3600, max(300, GpConfig::r2PresignTtl()));
            GpJson::send(['url' => R2Client::presignGet($key, $ttl), 'expiresIn' => $ttl]);
        } catch (Throwable $e) {
            if ($url !== '') {
                GpJson::send(['url' => $url, 'expiresIn' => 0]);
            }
            GpJson::error('R2_ERROR', 'Could not create preview URL.', 503);
        }
    }
}
