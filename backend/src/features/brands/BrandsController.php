<?php
declare(strict_types=1);

final class BrandsController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
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
            if ($brand === null) {
                GpJson::error('NOT_FOUND', 'Brand not found.', 404);
            }
            if ($sub === 'upload-intent' && $req->method === 'POST') {
                self::logoUploadIntent($actor, $brand, $req);
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
    private static function list(array $actor): never
    {
        $rows = GpDb::all(
            'SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC',
            [$actor['merchant_id']]
        );
        $out = [];
        foreach ($rows as $row) {
            $deviceCount = (int) (GpDb::one(
                "SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = 'active'",
                [$row['brand_id']]
            )['c'] ?? 0);
            $gwCount = (int) (GpDb::one(
                'SELECT COUNT(*) AS c FROM gp_gateways WHERE brand_id = ?',
                [$row['brand_id']]
            )['c'] ?? 0);
            $liveKey = GpDb::one(
                "SELECT prefix, key_sealed FROM gp_api_keys WHERE brand_id = ? AND mode = 'live' AND status = 'active' ORDER BY id DESC LIMIT 1",
                [$row['brand_id']]
            );
            $websitePlain = '';
            if (is_array($liveKey) && !empty($liveKey['key_sealed'])) {
                $websitePlain = GpCrypto::open((string) $liveKey['key_sealed']) ?? '';
            }
            $logoKey = trim((string) ($row['logo_object_key'] ?? ''));
            $logoUrl = trim((string) ($row['logo_url'] ?? ''));
            $out[] = [
                'brandId' => $row['brand_id'],
                'name' => $row['name'],
                'currencyCode' => $row['currency_code'] ?? 'BDT',
                'timezone' => $row['timezone'] ?? 'Asia/Dhaka',
                'webhookUrl' => $row['webhook_url'] ?? null,
                'active' => $row['brand_id'] === $actor['brand_id'],
                'deviceCount' => $deviceCount,
                'gatewayCount' => $gwCount,
                'logoConfigured' => $logoKey !== '' || $logoUrl !== '',
                'logoUrl' => $logoUrl !== '' ? $logoUrl : null,
                'websiteApiKey' => $websitePlain,
                'websiteApiKeyMasked' => ($websitePlain !== '' || (is_array($liveKey) && ($liveKey['prefix'] ?? '') !== ''))
                    ? '**********'
                    : '—',
                'websiteApiKeyCopyable' => $websitePlain !== '',
                'createdAt' => $row['created_at'] ?? null,
            ];
        }
        GpJson::send([
            'brands' => $out,
            'activeBrandId' => $actor['brand_id'],
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function create(array $actor, GpRequest $req): never
    {
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
                $webhookSecret,
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

        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $token = GpJwt::encode([
            'sub' => $actor['merchant_id'],
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
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found for your account.', 404);
        }
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        $token = GpJwt::encode([
            'sub' => $actor['merchant_id'],
            'brand' => $brand['brand_id'],
            'email' => $merchant['email'] ?? $actor['email'],
            'role' => $actor['role'] ?? 'merchant',
            'is_admin' => !empty($actor['is_admin']),
            'plan_id' => $actor['plan_id'] ?? 'starter',
        ]);
        GpJson::send([
            'brandId' => $brand['brand_id'],
            'name' => $brand['name'],
            'token' => $token,
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function update(array $actor, string $brandId, GpRequest $req): never
    {
        $brand = GpDb::one(
            'SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
            [$brandId, $actor['merchant_id']]
        );
        if ($brand === null) {
            GpJson::error('NOT_FOUND', 'Brand not found.', 404);
        }
        $name = trim((string) $req->input('name', $brand['name']));
        $webhookUrl = trim((string) $req->input('webhook_url', $brand['webhook_url'] ?? ''));
        if ($webhookUrl !== '') {
            $wh = GpWebhook::validateDestination($webhookUrl);
            if (!$wh['ok']) {
                GpJson::error('INVALID_URL', 'webhook_url rejected (' . ($wh['error'] ?? 'unsafe') . ').', 400);
            }
        }
        GpDb::exec(
            'UPDATE gp_brands SET name = ?, webhook_url = ?, updated_at = ? WHERE brand_id = ?',
            [$name, $webhookUrl !== '' ? $webhookUrl : null, GpIds::now(), $brandId]
        );
        $logoUrl = trim((string) $req->input('logoUrl', $req->input('logo_url', $brand['logo_url'] ?? '')));
        if ($logoUrl !== '' && !preg_match('#^https://#i', $logoUrl)) {
            GpJson::error('INVALID_URL', 'logoUrl must be an HTTPS URL.', 400);
        }
        if ($req->input('logoUrl', $req->input('logo_url', null)) !== null) {
            GpDb::exec(
                'UPDATE gp_brands SET logo_url = ?, updated_at = ? WHERE brand_id = ?',
                [$logoUrl !== '' ? $logoUrl : null, GpIds::now(), $brandId]
            );
        }
        GpJson::send([
            'brand' => [
                'brandId' => $brandId,
                'name' => $name,
                'webhookUrl' => $webhookUrl !== '' ? $webhookUrl : null,
                'logoUrl' => $logoUrl !== '' ? $logoUrl : null,
            ],
        ]);
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
            'UPDATE gp_brands SET logo_object_key = ?, logo_mime = ?, updated_at = ? WHERE brand_id = ?',
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
        // Keep merchant fallback URL in sync when a preview URL is available.
        if (is_string($preview) && $preview !== '') {
            GpDb::exec(
                'UPDATE gp_merchants SET brand_logo_url = ?, updated_at = ? WHERE merchant_id = ?',
                [$preview, GpIds::now(), $actor['merchant_id']]
            );
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
        GpDb::exec(
            'UPDATE gp_brands SET logo_object_key = NULL, logo_mime = NULL, updated_at = ? WHERE brand_id = ?',
            [GpIds::now(), $brand['brand_id']]
        );
        if ($key !== '' && R2Client::isConfigured()) {
            R2Client::deleteObject($key);
        }
        GpJson::send(['ok' => true, 'brandId' => $brand['brand_id'], 'logoConfigured' => false]);
    }

    /** @param array<string,mixed> $brand */
    private static function logoPreview(array $brand): never
    {
        $key = trim((string) ($brand['logo_object_key'] ?? ''));
        if ($key === '') {
            $url = trim((string) ($brand['logo_url'] ?? ''));
            if ($url === '') {
                GpJson::error('NOT_FOUND', 'No logo uploaded for this brand.', 404);
            }
            GpJson::send(['url' => $url, 'expiresIn' => 0]);
        }
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'Logo preview unavailable.', 503);
        }
        try {
            $ttl = min(3600, max(300, GpConfig::r2PresignTtl()));
            GpJson::send(['url' => R2Client::presignGet($key, $ttl), 'expiresIn' => $ttl]);
        } catch (Throwable $e) {
            GpJson::error('R2_ERROR', 'Could not create preview URL.', 503);
        }
    }
}
