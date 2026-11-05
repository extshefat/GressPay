<?php
declare(strict_types=1);

final class GatewaysController
{
    /** Methods that support optional checkout QR image upload (R2 or direct). */
    private static function qrCapableMethods(): array
    {
        return array_merge(
            GpCatalog::bdMobileWalletCodes(),
            ['usdt_trc20', 'binance_pay', 'bybit_pay', 'custom_provider']
        );
    }
    private const MAX_GATEWAYS_PER_BRAND = 40;

    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'manage_methods');
        GpRateLimiter::guard('gateways:' . (GpAuth::activeBrandId($actor) ?: $actor['merchant_id']), 60, 60);

        $id = $req->part(1);
        $action = $req->part(2);
        $sub = $req->part(3);

        if ($req->method === 'GET' && $id === null) {
            GpTeam::requireCan($actor, 'gateways', 'view');
            self::list($actor);
        }
        if ($req->method === 'POST' && $id === null) {
            GpTeam::requireCan($actor, 'gateways', 'create');
            self::create($actor, $req);
        }
        if ($req->method === 'PUT' && $id === 'reorder') {
            GpTeam::requireCan($actor, 'gateways', 'edit');
            self::reorder($actor, $req);
        }
        if ($id === null) {
            GpJson::error('NOT_FOUND', 'Gateway id required.', 404);
        }

        $gw = self::owned($actor['brand_id'], $id);

        if ($req->method === 'GET' && $action === null) {
            GpTeam::requireCan($actor, 'gateways', 'view');
            GpJson::send(['gateway' => self::present($gw)]);
        }
        if ($req->method === 'PUT' && $action === null) {
            GpTeam::requireCan($actor, 'gateways', 'edit');
            self::update($actor, $gw, $req);
        }
        if ($req->method === 'DELETE' && $action === null) {
            GpTeam::requireCan($actor, 'gateways', 'delete');
            self::delete($actor, $gw);
        }
        if ($req->method === 'POST' && $action === 'enable') {
            GpTeam::requireCan($actor, 'gateways', 'edit');
            self::setStatus($actor, $gw, 'active');
        }
        if ($req->method === 'POST' && $action === 'disable') {
            GpTeam::requireCan($actor, 'gateways', 'edit');
            self::setStatus($actor, $gw, 'inactive');
        }
        if ($action === 'qr' && ($sub === 'direct' || $sub === 'upload') && $req->method === 'POST') {
            self::directUploadQr($actor, $gw, $req);
        }
        if ($action === 'qr' && $sub === 'upload-intent' && $req->method === 'POST') {
            self::uploadIntent($actor, $gw, $req);
        }
        if ($action === 'qr' && $sub === 'complete' && $req->method === 'POST') {
            self::uploadComplete($actor, $gw, $req);
        }
        if ($action === 'qr' && ($sub === null || $sub === '') && $req->method === 'DELETE') {
            self::deleteQr($actor, $gw);
        }
        if ($action === 'qr' && $sub === 'preview' && $req->method === 'GET') {
            self::previewQr($gw);
        }

        GpJson::error('NOT_FOUND', 'Unknown gateways route.', 404);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor */
    private static function list(array $actor): never
    {
        if (GpAuth::activeBrandId($actor) === '') {
            GpJson::send([
                'gateways' => [],
                'r2Configured' => R2Client::isConfigured(),
                'maxUploadBytes' => GpConfig::r2MaxUploadBytes(),
                'allowedQrMime' => ['image/png', 'image/jpeg', 'image/webp'],
                'noBrand' => true,
            ]);
        }
        self::ensureBackfill();
        // Clear abandoned QR intents (pending with no stored object).
        try {
            GpDb::exec(
                "UPDATE gp_gateways SET qr_status = 'none', updated_at = ? WHERE brand_id = ? AND qr_status = 'pending' AND (qr_object_key IS NULL OR qr_object_key = '')",
                [GpIds::now(), $actor['brand_id']]
            );
        } catch (Throwable $e) {
            // non-fatal
        }
        $rows = GpDb::all(
            'SELECT * FROM gp_gateways WHERE brand_id = ? ORDER BY display_order ASC, id ASC',
            [$actor['brand_id']]
        );
        $list = array_map(static fn ($r) => self::present($r), $rows);
        GpJson::send([
            'gateways' => $list,
            'r2Configured' => R2Client::isConfigured(),
            'maxUploadBytes' => GpConfig::r2MaxUploadBytes(),
            'allowedQrMime' => ['image/png', 'image/jpeg', 'image/webp'],
        ]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor */
    private static function create(array $actor, GpRequest $req): never
    {
        $brandId = GpAuth::requireBrandContext($actor);
        $count = (int) (GpDb::one(
            'SELECT COUNT(*) AS c FROM gp_gateways WHERE brand_id = ?',
            [$brandId]
        )['c'] ?? 0);
        if ($count >= self::MAX_GATEWAYS_PER_BRAND) {
            GpJson::error('QUOTA', 'Gateway limit reached for this brand.', 400);
        }
        GpPlatform::assertGatewayCreationAllowed($brandId);

        $methodCode = GpCatalog::publicCode((string) $req->input('methodCode', $req->input('method_code', '')));
        $cat = GpCatalog::find($methodCode);
        if ($cat === null || empty($cat['releaseScope'])) {
            GpJson::error('METHOD_DISABLED', 'Method is not available in this release.', 400);
        }
        if (!GpCatalog::isPlatformEnabled($methodCode)) {
            GpJson::error('METHOD_DISABLED', 'This payment method has been disabled platform-wide by admin.', 400);
        }

        $displayName = trim((string) $req->input('displayName', $req->input('display_name', $cat['title'] ?? $methodCode)));
        if ($displayName === '' || strlen($displayName) > 120) {
            GpJson::error('INVALID_NAME', 'displayName is required (max 120 chars).', 400);
        }

        $account = trim((string) $req->input('account', $req->input('receivingNumber', '')));
        $binanceUid = trim((string) $req->input('binance_uid', ''));
        if ($methodCode === 'binance_pay') {
            // Persist UID (personal) or pay-id note (merchant API) on the gateway row for list/display.
            $account = $binanceUid !== '' ? $binanceUid : $account;
        } else {
            $account = self::validateAccount($methodCode, $account);
        }
        if ($methodCode === 'bybit_pay' && $account !== '') {
            self::assertUidFree($actor['brand_id'], $account, null);
        }
        if ($methodCode === 'binance_pay' && $account !== '') {
            self::assertUidFree($actor['brand_id'], $account, null);
        }

        $now = GpIds::now();
        $gwId = 'gw_' . bin2hex(random_bytes(8));
        $order = (int) (GpDb::one(
            'SELECT COALESCE(MAX(display_order), -1) AS m FROM gp_gateways WHERE brand_id = ?',
            [$actor['brand_id']]
        )['m'] ?? -1) + 1;

        $status = 'inactive';
        $enable = $req->input('enabled', false);
        if (($enable === true || $enable === 1 || $enable === '1') && ($account !== '' || $methodCode === 'binance_pay')) {
            $status = 'active';
        }

        if ($status === 'active') GpAuth::requireVerified($actor);
        [$gatewayFee, $feeType] = self::feeFromRequest($req, null);
        $exchangeRate = self::nullableAmount($req->input('exchangeRate', $req->input('custom_rate_bdt', null)));
        $gwCategory = trim((string) $req->input('gatewayCategory', $req->input('category', $cat['category'] ?? 'mfs')));

        GpDb::exec(
            'INSERT INTO gp_gateways (
                gateway_id, brand_id, method_code, display_name, account_type, account,
                currency, country, instructions, min_amount, max_amount, gateway_fee, gateway_fee_type,
                exchange_rate, gateway_category, display_order,
                status, qr_status, created_at, updated_at
             ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                $gwId,
                $actor['brand_id'],
                $methodCode,
                $displayName,
                self::accountType($req, 'personal', $methodCode),
                GpDb::storedWalletValue($methodCode, 'account', $account !== '' ? $account : null),
                strtoupper((string) $req->input('currency', $cat['currency'] ?? 'BDT')),
                strtoupper((string) $req->input('country', $cat['country'] ?? 'BD')),
                trim((string) $req->input('instructions', '')) ?: null,
                self::nullableAmount($req->input('minAmount', $req->input('min_amount', 10))),
                self::nullableAmount($req->input('maxAmount', $req->input('max_amount', 100000))),
                $gatewayFee,
                $feeType,
                $exchangeRate,
                $gwCategory !== '' ? $gwCategory : null,
                $order,
                $status,
                'none',
                $now,
                $now,
            ]
        );
        self::mirrorPrimaryMethod($actor['brand_id'], $methodCode);
        self::persistRailProfile($actor['brand_id'], $methodCode, $req, $account);
        self::syncMethodFeesFromGateway($actor['brand_id'], $methodCode, $gatewayFee, $feeType, $exchangeRate);
        self::audit($actor, 'gateway.create', ['gatewayId' => $gwId]);
        $row = self::owned($actor['brand_id'], $gwId);
        GpJson::send(['gateway' => self::present($row)], 201);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function update(array $actor, array $gw, GpRequest $req): never
    {
        $methodCode = (string) $gw['method_code'];
        $displayName = trim((string) $req->input('displayName', $gw['display_name']));
        if ($displayName === '' || strlen($displayName) > 120) {
            GpJson::error('INVALID_NAME', 'displayName is required (max 120 chars).', 400);
        }
        $accountIn = $req->input('account', $req->input('receivingNumber', '__omit__'));
        $binanceUid = trim((string) $req->input('binance_uid', ''));
        if ($accountIn === '__omit__') {
            $account = (string) ($gw['account'] ?? '');
            if ($methodCode === 'binance_pay' && $binanceUid !== '') {
                $account = $binanceUid;
            }
        } else {
            $account = trim((string) $accountIn);
            if ($methodCode === 'binance_pay') {
                if ($binanceUid !== '') {
                    $account = $binanceUid;
                }
            } elseif ($account !== '') {
                $account = self::validateAccount($methodCode, $account);
            }
        }
        if ($methodCode !== 'binance_pay' && $account === '' && ($gw['status'] ?? '') === 'active') {
            // Allow clear only if disabling — otherwise reject empty on active
            $willDisable = $req->input('enabled', null);
            if ($willDisable !== false && $willDisable !== 0 && $willDisable !== '0') {
                GpJson::error('DESTINATION_REQUIRED', 'Active gateways require a receiving account.', 400);
            }
        }

        if ($methodCode === 'bybit_pay' && $account !== '') {
            self::assertUidFree($actor['brand_id'], $account, (string) $gw['gateway_id']);
        }
        if ($methodCode === 'binance_pay' && $account !== '') {
            self::assertUidFree($actor['brand_id'], $account, (string) $gw['gateway_id']);
        }

        $status = (string) $gw['status'];
        if ($req->input('enabled', null) !== null) {
            $en = $req->input('enabled');
            $status = ($en === true || $en === 1 || $en === '1' || $en === 'true') ? 'active' : 'inactive';
            if ($status === 'active' && $methodCode !== 'binance_pay' && $account === '') {
                GpJson::error('DESTINATION_REQUIRED', 'Save a receiving account before enabling.', 400);
            }
        }

        if ($status === 'active') GpAuth::requireVerified($actor);
        [$gatewayFee, $feeType] = self::feeFromRequest($req, $gw);
        $exchangeRate = self::nullableAmount($req->input('exchangeRate', $req->input('custom_rate_bdt', $gw['exchange_rate'] ?? null)));
        $gwCategoryIn = $req->input('gatewayCategory', $req->input('category', null));
        $gwCategory = $gwCategoryIn !== null
            ? trim((string) $gwCategoryIn)
            : (string) ($gw['gateway_category'] ?? '');

        GpDb::exec(
            'UPDATE gp_gateways SET display_name = ?, account_type = ?, account = ?, currency = ?, country = ?,
             instructions = ?, min_amount = ?, max_amount = ?, gateway_fee = ?, gateway_fee_type = ?,
             exchange_rate = ?, gateway_category = ?, status = ?, updated_at = ?
             WHERE brand_id = ? AND gateway_id = ?',
            [
                $displayName,
                self::accountType($req, (string) ($gw['account_type'] ?? 'personal'), $methodCode),
                GpDb::storedWalletValue($methodCode, 'account', $account !== '' ? $account : null),
                strtoupper((string) $req->input('currency', $gw['currency'] ?? 'BDT')),
                strtoupper((string) $req->input('country', $gw['country'] ?? 'BD')),
                trim((string) $req->input('instructions', $gw['instructions'] ?? '')) ?: null,
                self::nullableAmount($req->input('minAmount', $gw['min_amount'] ?? null)),
                self::nullableAmount($req->input('maxAmount', $gw['max_amount'] ?? null)),
                $gatewayFee,
                $feeType,
                $exchangeRate,
                $gwCategory !== '' ? $gwCategory : null,
                $status,
                GpIds::now(),
                $actor['brand_id'],
                $gw['gateway_id'],
            ]
        );
        self::mirrorPrimaryMethod($actor['brand_id'], $methodCode);
        self::persistRailProfile($actor['brand_id'], $methodCode, $req, $account);
        self::syncMethodFeesFromGateway($actor['brand_id'], $methodCode, $gatewayFee, $feeType, $exchangeRate);
        self::audit($actor, 'gateway.update', ['gatewayId' => $gw['gateway_id']]);
        GpJson::send(['gateway' => self::present(self::owned($actor['brand_id'], (string) $gw['gateway_id']))]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function setStatus(array $actor, array $gw, string $status): never
    {
        if ($status === 'active') GpAuth::requireVerified($actor);
        if ($status === 'active' && (string) ($gw['method_code'] ?? '') !== 'binance_pay') {
            if (trim((string) ($gw['account'] ?? '')) === '') {
                GpJson::error('DESTINATION_REQUIRED', 'Save a receiving account before enabling.', 400);
            }
        }
        GpDb::exec(
            'UPDATE gp_gateways SET status = ?, updated_at = ? WHERE brand_id = ? AND gateway_id = ?',
            [$status, GpIds::now(), $actor['brand_id'], $gw['gateway_id']]
        );
        self::mirrorPrimaryMethod($actor['brand_id'], (string) $gw['method_code']);
        self::audit($actor, 'gateway.' . $status, ['gatewayId' => $gw['gateway_id']]);
        GpJson::send(['gateway' => self::present(self::owned($actor['brand_id'], (string) $gw['gateway_id']))]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor */
    private static function reorder(array $actor, GpRequest $req): never
    {
        GpAuth::requireBrandContext($actor);
        $order = $req->input('order', $req->input('gatewayIds', []));
        if (!is_array($order) || $order === []) {
            GpJson::error('INVALID_ORDER', 'Provide order as an array of gatewayIds.', 400);
        }
        $i = 0;
        foreach ($order as $gid) {
            $gid = (string) $gid;
            GpDb::exec(
                'UPDATE gp_gateways SET display_order = ?, updated_at = ? WHERE brand_id = ? AND gateway_id = ?',
                [$i++, GpIds::now(), $actor['brand_id'], $gid]
            );
        }
        self::audit($actor, 'gateway.reorder', ['count' => count($order)]);
        self::list($actor);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function delete(array $actor, array $gw): never
    {
        $key = (string) ($gw['qr_object_key'] ?? '');
        GpDb::exec(
            'DELETE FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
            [$actor['brand_id'], $gw['gateway_id']]
        );
        if ($key !== '' && R2Client::isConfigured()) {
            R2Client::deleteObject($key);
        }
        self::mirrorPrimaryMethod($actor['brand_id'], (string) $gw['method_code']);
        self::audit($actor, 'gateway.delete', ['gatewayId' => $gw['gateway_id']]);
        GpJson::send(['ok' => true, 'deleted' => $gw['gateway_id']]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function uploadIntent(array $actor, array $gw, GpRequest $req): never
    {
        GpRateLimiter::guard('qr-upload:' . $actor['brand_id'], 20, 60);
        if (!in_array((string) $gw['method_code'], self::qrCapableMethods(), true)) {
            GpJson::error('QR_UNSUPPORTED', 'This payment method does not support QR image upload.', 400);
        }
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'QR upload unavailable — platform R2 is not configured.', 503);
        }
        $contentType = strtolower(trim((string) $req->input('contentType', $req->input('mimeType', ''))));
        if (!in_array($contentType, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            GpJson::error('INVALID_MIME', 'Allowed types: image/png, image/jpeg, image/webp.', 400);
        }
        $declaredSize = (int) $req->input('byteSize', $req->input('size', 0));
        $max = GpConfig::r2MaxUploadBytes();
        if ($declaredSize <= 0 || $declaredSize > $max) {
            GpJson::error('FILE_TOO_LARGE', 'File size must be between 1 and ' . $max . ' bytes.', 400);
        }
        $ext = R2Client::extensionForMime($contentType);
        $objectKey = sprintf(
            'brands/%s/gateways/%s/%s.%s',
            $actor['brand_id'],
            $gw['gateway_id'],
            bin2hex(random_bytes(16)),
            $ext
        );
        try {
            $presign = R2Client::presignPut($objectKey, $contentType);
        } catch (Throwable $e) {
            error_log('[R2] presignPut failed');
            GpJson::error('R2_ERROR', 'Could not create upload URL.', 503);
        }
        GpDb::exec(
            'UPDATE gp_gateways SET qr_status = ?, updated_at = ? WHERE brand_id = ? AND gateway_id = ?',
            ['pending', GpIds::now(), $actor['brand_id'], $gw['gateway_id']]
        );
        // Store pending key in a side channel via metadata table? Use temporary pending key field — store in qr_object_key only on complete.
        // Persist intent key in audit meta only; client must echo objectKey on complete.
        self::audit($actor, 'gateway.qr.intent', ['gatewayId' => $gw['gateway_id'], 'objectKeySuffix' => substr($objectKey, -20)]);
        GpJson::send([
            'uploadUrl' => $presign['url'],
            'requiredHeaders' => $presign['headers'],
            'objectKey' => $objectKey,
            'expiresIn' => $presign['expiresIn'],
            'maxBytes' => $max,
            'contentType' => $contentType,
            'note' => 'PUT the file to uploadUrl, then call upload-complete with the same objectKey. Secrets are never returned.',
        ]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function uploadComplete(array $actor, array $gw, GpRequest $req): never
    {
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'QR upload unavailable — platform R2 is not configured.', 503);
        }
        $objectKey = trim((string) $req->input('objectKey', ''));
        $prefix = 'brands/' . $actor['brand_id'] . '/gateways/' . $gw['gateway_id'] . '/';
        if ($objectKey === '' || !str_starts_with($objectKey, $prefix) || str_contains($objectKey, '..')) {
            GpJson::error('INVALID_KEY', 'objectKey is not valid for this gateway.', 400);
        }
        $bytes = R2Client::readObject($objectKey, min(3 * 1024 * 1024, GpConfig::r2MaxUploadBytes()));
        try {
            if ($bytes === null) throw new InvalidArgumentException('Upload is missing or too large.');
            $image = GpQrStorage::validate($bytes);
            $validatedKey = GpQrStorage::put($image);
        } catch (InvalidArgumentException $e) {
            GpJson::error('INVALID_IMAGE', 'Upload must be a valid PNG, JPEG or WebP QR image (max 2048px and 3MB).', 400);
        }
        // Upload URL remains writable until expiry. Store a separate sanitized immutable copy.
        $len = strlen($image['bytes']); $ctype = $image['mime'];
        $checksum = $image['checksum'];
        $oldKey = (string) ($gw['qr_object_key'] ?? '');
        $objectKey = $validatedKey;
        GpDb::exec(
            'UPDATE gp_gateways SET qr_object_key = ?, qr_mime = ?, qr_bytes = ?, qr_checksum = ?, qr_status = ?, updated_at = ?
             WHERE brand_id = ? AND gateway_id = ?',
            [$objectKey, $ctype, $len, $checksum, 'ready', GpIds::now(), $actor['brand_id'], $gw['gateway_id']]
        );
        if ($oldKey !== '' && $oldKey !== $objectKey) {
            R2Client::deleteObject($oldKey);
        }
        self::audit($actor, 'gateway.qr.complete', ['gatewayId' => $gw['gateway_id'], 'bytes' => $len]);
        GpJson::send(['gateway' => self::present(self::owned($actor['brand_id'], (string) $gw['gateway_id']))]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function deleteQr(array $actor, array $gw): never
    {
        $key = (string) ($gw['qr_object_key'] ?? '');
        GpDb::exec(
            'UPDATE gp_gateways SET qr_object_key = NULL, qr_mime = NULL, qr_bytes = NULL, qr_checksum = NULL, qr_status = ?, updated_at = ?
             WHERE brand_id = ? AND gateway_id = ?',
            ['none', GpIds::now(), $actor['brand_id'], $gw['gateway_id']]
        );
        if ($key !== '' && R2Client::isConfigured()) {
            R2Client::deleteObject($key);
        }
        self::audit($actor, 'gateway.qr.delete', ['gatewayId' => $gw['gateway_id']]);
        GpJson::send(['gateway' => self::present(self::owned($actor['brand_id'], (string) $gw['gateway_id']))]);
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor @param array<string,mixed> $gw */
    private static function directUploadQr(array $actor, array $gw, GpRequest $req): never
    {
        GpRateLimiter::guard('qr-direct:' . $actor['brand_id'], 30, 60);
        if (!in_array((string) $gw['method_code'], self::qrCapableMethods(), true)) GpJson::error('QR_UNSUPPORTED', 'This payment method does not support QR images.', 400);
        try {
            if (!empty($_FILES['file']['tmp_name'])) {
                if ((int) ($_FILES['file']['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || filesize($_FILES['file']['tmp_name']) > 3 * 1024 * 1024) throw new InvalidArgumentException('Invalid upload.');
                $image = GpQrStorage::validate((string) file_get_contents($_FILES['file']['tmp_name']));
            } else {
                $image = GpQrStorage::fromDataUrl(trim((string) $req->input('dataUrl', $req->input('image', ''))));
            }
            $key = GpQrStorage::put($image);
        } catch (InvalidArgumentException $e) {
            GpJson::error('INVALID_IMAGE', 'Upload must be a valid PNG, JPEG or WebP QR image (max 2048px and 3MB).', 400);
        }
        $mime = $image['mime']; $len = strlen($image['bytes']); $checksum = $image['checksum'];
        GpDb::exec(
            'UPDATE gp_gateways SET qr_object_key = ?, qr_mime = ?, qr_bytes = ?, qr_checksum = ?, qr_status = ?, updated_at = ?
             WHERE brand_id = ? AND gateway_id = ?',
            [$key, $mime, $len, $checksum, 'ready', GpIds::now(), $actor['brand_id'], $gw['gateway_id']]
        );

        self::audit($actor, 'gateway.qr.direct', ['gatewayId' => $gw['gateway_id'], 'bytes' => $len]);

        GpJson::send([
            'ok' => true,
            'gatewayId' => $gw['gateway_id'],
            'qrStatus' => 'ready',
            'qrUrl' => GpQrStorage::url($key),
        ]);
    }

    /** @param array<string,mixed> $gw */
    private static function previewQr(array $gw): never
    {
        $key = (string) ($gw['qr_object_key'] ?? '');
        if ($key === '' || ($gw['qr_status'] ?? '') !== 'ready') {
            GpJson::error('NO_QR', 'No QR image ready for this gateway.', 404);
        }
        if (str_starts_with($key, 'local-qr/')) {
            GpJson::send(['url'=>GpQrStorage::url($key),'expiresIn'=>0,'mime'=>'image/png']);
        }
        if (str_starts_with($key, 'data:')) GpJson::error('NO_QR', 'QR requires migration.', 409);
        if (!R2Client::isConfigured()) {
            GpJson::error('R2_UNAVAILABLE', 'QR preview unavailable.', 503);
        }
        $url = R2Client::presignGet($key, min(600, GpConfig::r2PresignTtl()));
        GpJson::send([
            'url' => $url,
            'expiresIn' => min(600, GpConfig::r2PresignTtl()),
            'mime' => $gw['qr_mime'] ?? null,
            'note' => 'Short-lived URL for merchant preview only. Scanning a QR does not complete payment.',
        ]);
    }

    /** @return array<string,mixed> */
    private static function owned(string $brandId, string $gatewayId): array
    {
        $row = GpDb::one(
            'SELECT * FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?',
            [$brandId, $gatewayId]
        );
        if ($row === null) {
            GpJson::error('NOT_FOUND', 'Gateway not found.', 404);
        }
        return $row;
    }

    /** @param array<string,mixed> $gw @return array<string,mixed> */
    public static function present(array $gw, bool $includeQrUrl = false): array
    {
        $methodCode = (string) ($gw['method_code'] ?? '');
        $account = trim((string) ($gw['account'] ?? ''));
        $status = (string) ($gw['status'] ?? 'inactive');
        $qrStatus = (string) ($gw['qr_status'] ?? 'none');
        $readiness = self::readiness($gw);

        $out = [
            'id' => (string) $gw['gateway_id'],
            'gatewayId' => (string) $gw['gateway_id'],
            'methodCode' => $methodCode,
            'displayName' => (string) ($gw['display_name'] ?? ''),
            'accountType' => (string) ($gw['account_type'] ?? 'personal'),
            'account' => $account !== '' ? $account : null,
            'depositAddressOrNumber' => $account !== '' ? $account : null,
            'currency' => (string) ($gw['currency'] ?? 'BDT'),
            'country' => (string) ($gw['country'] ?? 'BD'),
            'instructions' => $gw['instructions'] ?? null,
            'minAmount' => $gw['min_amount'] !== null && $gw['min_amount'] !== '' ? (string) $gw['min_amount'] : null,
            'maxAmount' => $gw['max_amount'] !== null && $gw['max_amount'] !== '' ? (string) $gw['max_amount'] : null,
            'gatewayFee' => $gw['gateway_fee'] !== null && $gw['gateway_fee'] !== '' ? (string) $gw['gateway_fee'] : '0',
            'gatewayFeeType' => (string) ($gw['gateway_fee_type'] ?? 'percentage'),
            'exchangeRate' => $gw['exchange_rate'] !== null && $gw['exchange_rate'] !== '' ? (string) $gw['exchange_rate'] : null,
            'gatewayCategory' => $gw['gateway_category'] ?? null,
            'displayOrder' => (int) ($gw['display_order'] ?? 0),
            'enabled' => $status === 'active',
            'status' => $status,
            'qrStatus' => $qrStatus,
            'qrMime' => $gw['qr_mime'] ?? null,
            'qrBytes' => isset($gw['qr_bytes']) ? (int) $gw['qr_bytes'] : null,
            'supportsQr' => in_array($methodCode, self::qrCapableMethods(), true),
            'readiness' => $readiness,
            'readinessReasons' => self::readinessReasons($gw, $readiness),
            'r2Configured' => R2Client::isConfigured(),
            'createdAt' => $gw['created_at'] ?? null,
            'updatedAt' => $gw['updated_at'] ?? null,
        ];
        $profile = GpDb::one(
            'SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?',
            [(string) ($gw['brand_id'] ?? ''), $methodCode]
        );
        $opts = [];
        if ($profile) {
            $decoded = json_decode((string) ($profile['options'] ?? ''), true);
            $opts = is_array($decoded) ? $decoded : [];
        }
        if ($methodCode === 'bybit_pay') {
            $out['bybit_uid'] = (string) ($opts['bybit_uid'] ?? $account);
            $out['wallet_address'] = (string) ($opts['wallet_address'] ?? '');
            $out['account_name'] = (string) ($opts['account_name'] ?? '');
        }
        if ($methodCode === 'binance_pay') {
            $out['mode'] = (string) ($opts['mode'] ?? 'merchant');
            $out['binance_uid'] = (string) ($opts['binance_uid'] ?? ($account !== '' ? $account : ''));
            $out['account_name'] = (string) ($opts['account_name'] ?? '');
            $brand = GpDb::one('SELECT binance_pay_json, crypto_enabled FROM gp_brands WHERE brand_id = ?', [(string) ($gw['brand_id'] ?? '')]);
            $brandCreds = BinancePayClient::credentialsForBrand(is_array($brand) ? $brand : []);
            $liveConfigured = $brandCreds !== null;
            $out['apiKeySet'] = $liveConfigured;
            $out['apiSecretSet'] = $liveConfigured;
            $out['certificateSnSet'] = $liveConfigured;
            $out['binanceLiveConfigured'] = $liveConfigured;
        }
        if (in_array($methodCode, GpCatalog::bdMobileWalletCodes(), true)) {
            $out['usernameSet'] = trim((string) ($opts['username'] ?? '')) !== '';
            $out['passwordSet'] = trim((string) ($opts['password_sealed'] ?? '')) !== '';
            $out['apiKeySet'] = trim((string) ($opts['api_key_sealed'] ?? '')) !== '';
            $out['apiSecretSet'] = trim((string) ($opts['api_secret_sealed'] ?? '')) !== '';
        }
        if (isset($opts['custom_rate_bdt']) && (float) $opts['custom_rate_bdt'] > 0) {
            $out['custom_rate_bdt'] = (float) $opts['custom_rate_bdt'];
        }
        if ($includeQrUrl && $qrStatus === 'ready' && !empty($gw['qr_object_key'])) {
            $qrKey = (string) $gw['qr_object_key'];
            if (str_starts_with($qrKey, 'local-qr/')) {
                $out['qrImageUrl'] = GpQrStorage::url($qrKey);
            } elseif (str_starts_with($qrKey, 'data:')) {
                $out['qrImageUrl'] = null;
            } elseif (R2Client::isConfigured()) {
                try {
                    $out['qrImageUrl'] = R2Client::presignGet($qrKey, min(900, GpConfig::r2PresignTtl()));
                } catch (Throwable $e) {
                    $out['qrImageUrl'] = null;
                }
            } else {
                $out['qrImageUrl'] = null;
            }
        }
        return $out;
    }

    private static function accountType(GpRequest $req, string $fallback = 'personal', string $methodCode = ''): string
    {
        $raw = strtolower(trim((string) $req->input('accountType', $req->input('account_type', $fallback))));
        if (!in_array($raw, ['personal', 'agent', 'merchant', 'payment'], true)) {
            $raw = 'personal';
        }
        $allowed = self::allowedAccountTypes($methodCode !== '' ? $methodCode : 'bkash');
        if ($methodCode !== '' && !in_array($raw, $allowed, true)) {
            GpJson::error(
                'INVALID_ACCOUNT_TYPE',
                'Account type “' . $raw . '” is not allowed for ' . $methodCode . '. Allowed: ' . implode(', ', $allowed) . '.',
                400
            );
        }
        return $raw;
    }

    /** @return list<string> */
    public static function allowedAccountTypes(string $methodCode): array
    {
        $code = strtolower($methodCode);
        if ($code === 'bkash') {
            return ['personal', 'agent', 'payment', 'merchant'];
        }
        if (in_array($code, ['nagad', 'rocket', 'upay'], true)) {
            return ['personal', 'agent', 'payment'];
        }
        if ($code === 'cellfin') {
            return ['personal', 'agent'];
        }
        if (in_array($code, ['bangla_qr', 'bangla_qr_v2'], true)) {
            return ['personal', 'merchant'];
        }
        return ['personal', 'agent', 'payment', 'merchant'];
    }

    /** @param array<string,mixed> $gw */
    public static function readiness(array $gw): string
    {
        $method = (string) ($gw['method_code'] ?? '');
        $account = trim((string) ($gw['account'] ?? ''));
        $status = (string) ($gw['status'] ?? 'inactive');
        $qr = (string) ($gw['qr_status'] ?? 'none');

        if (!GpCatalog::isPlatformEnabled($method)) {
            return 'disabled_by_admin';
        }

        if ($method === 'binance_pay') {
            if ($status !== 'active') {
                return 'disabled';
            }
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [(string) ($gw['brand_id'] ?? '')]);
            if (!is_array($brand) || !BinancePayClient::brandHasSealedCredentials($brand)) {
                return 'setup_incomplete';
            }
            $cat = GpCatalog::find('binance_pay');
            if (!is_array($cat)) {
                return 'needs_attention';
            }
            $ready = GpMethodReadiness::evaluate($cat, ['status' => 'active', 'options' => '{}'], $brand);
            return !empty($ready['liveReady']) ? 'live_ready' : 'needs_attention';
        }

        if (in_array($method, GpCatalog::bdMobileWalletCodes(), true)) {
            $accountType = strtolower((string) ($gw['account_type'] ?? 'personal'));
            if ($account === '') {
                return 'setup_incomplete';
            }
            if ($status !== 'active') {
                return 'configured_disabled';
            }
            // Illegal merchant on non-bkash rails → incomplete until edited.
            if ($accountType === 'merchant' && $method !== 'bkash') {
                return 'setup_incomplete';
            }
            $hasDevice = false;
            try {
                $hasDevice = (int) (GpDb::one(
                    "SELECT COUNT(*) as c FROM gp_devices WHERE brand_id = ? AND status = 'active'",
                    [(string) ($gw['brand_id'] ?? '')]
                )['c'] ?? 0) > 0;
            } catch (Throwable $e) {
                // non-fatal
            }
            // bKash merchant: API keys required + Companion SMS for live settle this release.
            if ($method === 'bkash' && $accountType === 'merchant') {
                $profile = GpDb::one(
                    'SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?',
                    [(string) ($gw['brand_id'] ?? ''), $method]
                );
                $opts = is_array($profile)
                    ? (json_decode((string) ($profile['options'] ?? '{}'), true) ?: [])
                    : [];
                $hasApi = trim((string) ($opts['api_key_sealed'] ?? '')) !== ''
                    && trim((string) ($opts['api_secret_sealed'] ?? '')) !== '';
                if (!$hasApi) {
                    return 'setup_incomplete';
                }
                return $hasDevice ? 'live_ready' : 'needs_companion';
            }
            // personal / agent / payment (and all Nagad/Rocket/Upay types): Companion required.
            if (!$hasDevice) {
                return 'needs_companion';
            }
            return 'live_ready';
        }

        if ($account === '') {
            return 'setup_incomplete';
        }
        if ($qr === 'pending') {
            return 'qr_pending';
        }
        if (in_array($method, self::qrCapableMethods(), true) && !R2Client::isConfigured() && $qr !== 'ready') {
            // Account ok; QR optional when R2 missing
            if ($status !== 'active') {
                return 'configured_disabled';
            }
            return 'live_ready';
        }
        if ($status !== 'active') {
            return 'configured_disabled';
        }
        if ($qr === 'failed') {
            return 'needs_attention';
        }
        return 'live_ready';
    }

    /**
     * Human-readable reasons for a readiness state (dashboard + checkout empty-state).
     *
     * @param array<string,mixed> $gw
     * @return list<string>
     */
    public static function readinessReasons(array $gw, ?string $readiness = null): array
    {
        $state = $readiness ?? self::readiness($gw);
        $method = (string) ($gw['method_code'] ?? '');
        $account = trim((string) ($gw['account'] ?? ''));

        if ($state === 'live_ready' || $state === 'ready_test') {
            return [];
        }
        if ($state === 'disabled_by_admin') {
            return ['This rail is disabled by Super Admin (platform-wide).'];
        }
        if ($state === 'disabled' || $state === 'configured_disabled') {
            return ['Gateway is turned off. Enable it to accept payments.'];
        }
        if ($state === 'qr_pending') {
            return ['QR upload is still pending — finish or remove the pending file.'];
        }
        if ($state === 'needs_companion') {
            return ['Pair an active Companion device for this brand (Devices page) so SMS can match payments.'];
        }
        if ($method === 'binance_pay') {
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [(string) ($gw['brand_id'] ?? '')]);
            $reasons = [];
            if (!is_array($brand) || !BinancePayClient::brandHasSealedCredentials($brand)) {
                $reasons[] = 'Add Binance API Key, Secret Key, and Certificate SN, then save.';
            }
            if (is_array($brand) && empty($brand['crypto_enabled'])) {
                $reasons[] = 'Crypto rails are off for this brand (auto-enabled when API credentials are saved).';
            }
            if (!GpConfig::cryptoAllowed()) {
                $reasons[] = 'Operator must set GRESSPAY_CRYPTO_ALLOWED on the API.';
            }
            return $reasons !== [] ? $reasons : ['Binance Pay setup is incomplete.'];
        }
        if ($state === 'setup_incomplete') {
            if ($account === '') {
                return ['Receiving account / wallet number is required.'];
            }
            $accountType = strtolower((string) ($gw['account_type'] ?? 'personal'));
            if ($accountType === 'merchant' && $method !== 'bkash') {
                return ['This rail has no Merchant API — switch to Personal, Agent, or Payment and save.'];
            }
            if ($method === 'bkash' && $accountType === 'merchant') {
                return ['bKash Merchant needs API Key + Secret (live settle still uses Companion SMS).'];
            }
            return ['Finish gateway credentials before going live.'];
        }
        if ($state === 'needs_companion' && $method === 'bkash' && strtolower((string) ($gw['account_type'] ?? '')) === 'merchant') {
            return ['API keys saved — pair a Companion device so SMS can confirm live bKash Merchant payments.'];
        }
        if ($state === 'needs_attention') {
            return ['Review credentials or QR — this gateway needs attention before checkout.'];
        }
        return ['Gateway is not ready for checkout yet.'];
    }

    public static function validateAccount(string $methodCode, string $dest): string
    {
        $dest = trim($dest);
        if ($dest === '') {
            return '';
        }
        if (in_array($methodCode, GpCatalog::bdMobileWalletCodes(), true)) {
            $digits = preg_replace('/\D+/', '', $dest) ?? '';
            if ($methodCode === 'rocket') {
                if (preg_match('/^8801[3-9]\d{8,9}$/', $digits)) {
                    return '0' . substr($digits, 3);
                }
                if (preg_match('/^01[3-9]\d{8,9}$/', $digits)) {
                    return $digits;
                }
                GpJson::error('INVALID_ACCOUNT', 'Enter a valid Rocket account number (11 or 12 digits).', 400);
            }
            if (preg_match('/^8801[3-9]\d{8}$/', $digits)) {
                return '0' . substr($digits, 3);
            }
            if (preg_match('/^01[3-9]\d{8}$/', $digits)) {
                return $digits;
            }
            GpJson::error('INVALID_ACCOUNT', 'Enter a valid Bangladesh mobile number (01XXXXXXXXX).', 400);
        }
        if ($methodCode === 'bybit_pay') {
            $cleaned = trim($dest);
            if (strlen($cleaned) < 4 || strlen($cleaned) > 50) {
                GpJson::error('INVALID_ACCOUNT', 'Enter a valid Bybit UID or Account ID.', 400);
            }
            return $cleaned;
        }
        if ($methodCode === 'usdt_trc20') {
            $norm = TronUsdtVerifier::normalizeBase58($dest);
            if ($norm === '' || !str_starts_with($norm, 'T')) {
                GpJson::error('INVALID_ADDRESS', 'Enter a valid TRON Base58Check address.', 400);
            }
            $contract = TronUsdtVerifier::normalizeBase58(GpConfig::usdtTrc20Contract());
            if ($contract !== '' && $norm === $contract) {
                GpJson::error('INVALID_ADDRESS', 'That is the USDT contract, not your wallet.', 400);
            }
            return $norm;
        }
        return $dest;
    }

    /** Reject a UID already stored on another gateway of this brand. */
    private static function assertUidFree(string $brandId, string $uid, ?string $exceptGatewayId): void
    {
        $uid = trim($uid);
        if ($uid === '') {
            return;
        }
        $rows = GpDb::all('SELECT gateway_id, method_code, account FROM gp_gateways WHERE brand_id = ?', [$brandId]);
        foreach ($rows as $row) {
            if ($exceptGatewayId !== null && (string) $row['gateway_id'] === $exceptGatewayId) {
                continue;
            }
            if (!in_array((string) ($row['method_code'] ?? ''), ['bybit_pay', 'binance_pay'], true)) {
                continue;
            }
            if (strcasecmp(trim((string) ($row['account'] ?? '')), $uid) === 0) {
                GpJson::error('UID_IN_USE', 'That UID is already saved on this brand.', 409);
            }
        }
        $methods = GpDb::all('SELECT code, options FROM gp_methods WHERE brand_id = ?', [$brandId]);
        foreach ($methods as $row) {
            $opts = json_decode((string) ($row['options'] ?? ''), true);
            if (!is_array($opts)) {
                continue;
            }
            foreach (['bybit_uid', 'binance_uid'] as $key) {
                $saved = trim((string) ($opts[$key] ?? ''));
                if ($saved !== '' && strcasecmp($saved, $uid) === 0) {
                    $sameRail = ($key === 'bybit_uid' && (string) $row['code'] === 'bybit_pay')
                        || ($key === 'binance_uid' && (string) $row['code'] === 'binance_pay');
                    if ($sameRail && $exceptGatewayId !== null) {
                        continue;
                    }
                    if ($sameRail && $exceptGatewayId === null) {
                        GpJson::error('UID_IN_USE', 'That UID is already saved on this brand.', 409);
                    }
                    if (!$sameRail) {
                        GpJson::error('UID_IN_USE', 'That UID is already saved on this brand.', 409);
                    }
                }
            }
        }
    }

    /** Store manual UID fields. Secrets are sealed and never returned. */
    private static function persistRailProfile(string $brandId, string $methodCode, GpRequest $req, string $account): void
    {
        $mfs = GpCatalog::bdMobileWalletCodes();
        if (!in_array($methodCode, array_merge(['bybit_pay', 'binance_pay', 'usdt_trc20'], $mfs), true)) {
            return;
        }
        $existing = GpDb::one('SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, $methodCode]);
        $prev = [];
        if ($existing) {
            $decoded = json_decode((string) ($existing['options'] ?? ''), true);
            $prev = is_array($decoded) ? $decoded : [];
        }
        if (in_array($methodCode, $mfs, true)) {
            $accountType = self::accountType($req, (string) ($prev['account_type'] ?? 'personal'), $methodCode);
            $prev['account_type'] = $accountType;
            if ($account !== '') {
                $prev['account'] = $account;
                $prev['depositAddressOrNumber'] = $account;
                $prev['mobile_number'] = $account;
            }
            // Seal API secrets only for bKash merchant — reject stray keys on other rails.
            $allowSecrets = $methodCode === 'bkash' && $accountType === 'merchant';
            foreach (['username', 'password', 'api_key', 'api_secret', 'app_key', 'app_secret'] as $secretKey) {
                $secret = $req->input($secretKey, null);
                if (!is_string($secret) || trim($secret) === '') {
                    continue;
                }
                if (!$allowSecrets) {
                    GpJson::error(
                        'API_NOT_ALLOWED',
                        'API credentials are only accepted for bKash Merchant accounts.',
                        400
                    );
                }
                if (in_array($secretKey, ['username'], true)) {
                    $prev['username'] = trim($secret);
                    continue;
                }
                $prev[$secretKey . '_sealed'] = GpCrypto::seal(trim($secret));
                unset($prev[$secretKey]);
            }
            $json = GpDb::storedWalletValue($methodCode, 'options', json_encode($prev, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            $now = GpIds::now();
            if ($existing) {
                GpDb::exec(
                    'UPDATE gp_methods SET options = ?, updated_at = ? WHERE brand_id = ? AND code = ?',
                    [$json, $now, $brandId, $methodCode]
                );
            } else {
                GpDb::exec(
                    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
                    [$brandId, $methodCode, 'inactive', $json, $now, $now]
                );
            }
            return;
        }
        if ($methodCode === 'bybit_pay') {
            $uid = trim((string) $req->input('bybit_uid', $account));
            if ($uid !== '') {
                $prev['bybit_uid'] = $uid;
                $prev['account'] = $uid;
                $prev['depositAddressOrNumber'] = $uid;
            }
            foreach (['wallet_address', 'account_name'] as $key) {
                if ($req->input($key, null) !== null) {
                    $prev[$key] = trim((string) $req->input($key));
                }
            }
        }
        if ($methodCode === 'binance_pay') {
            $mode = strtolower(trim((string) $req->input('mode', $prev['mode'] ?? 'merchant')));
            if (!in_array($mode, ['merchant', 'personal'], true)) {
                GpJson::error('INVALID_MODE', 'Binance mode must be merchant or personal.', 400);
            }
            $prev['mode'] = $mode;
            $uid = trim((string) $req->input('binance_uid', $account !== '' ? $account : ($prev['binance_uid'] ?? '')));
            if ($uid !== '') {
                $prev['binance_uid'] = $uid;
            }
            if ($req->input('account_name', null) !== null) {
                $prev['account_name'] = trim((string) $req->input('account_name'));
            }
            // Canonical live credentials live on gp_brands.binance_pay_json (same as Settings).
            $apiKey = trim((string) $req->input('api_key', $req->input('apiKey', '')));
            $apiSecret = trim((string) $req->input('api_secret', $req->input('apiSecret', $req->input('secret', ''))));
            $certSn = trim((string) $req->input('certificate_sn', $req->input('certificateSn', '')));
            if ($apiKey !== '' || $apiSecret !== '' || $certSn !== '') {
                if ($apiKey === '' || $apiSecret === '') {
                    GpJson::error(
                        'MISSING_FIELD',
                        'Binance Pay requires api_key and api_secret together.',
                        400
                    );
                }
                if ($certSn === '') {
                    GpJson::error(
                        'MISSING_FIELD',
                        'Binance Pay requires certificate_sn (Certificate SN from Binance Merchant dashboard).',
                        400
                    );
                }
                $sealed = GpCrypto::seal(json_encode([
                    'apiKey' => $apiKey,
                    'secret' => $apiSecret,
                    'certificateSn' => $certSn,
                ], JSON_UNESCAPED_SLASHES));
                // Seal credentials and auto-enable brand crypto rails so checkout can surface Binance.
                GpDb::exec(
                    'UPDATE gp_brands SET binance_pay_json = ?, crypto_enabled = 1, updated_at = ? WHERE brand_id = ?',
                    [$sealed, GpIds::now(), $brandId]
                );
                // Drop orphan sealed keys so live path is unambiguous.
                unset($prev['api_key_sealed'], $prev['api_secret_sealed'], $prev['api_key'], $prev['api_secret']);
            }
        }
        if ($methodCode === 'usdt_trc20' && $account !== '') {
            $prev['account'] = $account;
            $prev['depositAddressOrNumber'] = $account;
            $wallet = trim((string) $req->input('wallet_address', ''));
            if ($wallet !== '') {
                $prev['wallet_address'] = $wallet;
            }
            GpDb::exec(
                'UPDATE gp_brands SET crypto_enabled = 1, updated_at = ? WHERE brand_id = ?',
                [GpIds::now(), $brandId]
            );
        }
        if ($methodCode === 'bybit_pay') {
            GpDb::exec(
                'UPDATE gp_brands SET crypto_enabled = 1, updated_at = ? WHERE brand_id = ?',
                [GpIds::now(), $brandId]
            );
        }
        if ($req->input('custom_rate_bdt', null) !== null && $req->input('custom_rate_bdt') !== '') {
            $rate = (float) $req->input('custom_rate_bdt');
            if ($rate <= 0) {
                GpJson::error('INVALID_RATE', 'custom_rate_bdt must be a positive BDT per USDT rate.', 400);
            }
            $prev['custom_rate_bdt'] = $rate;
        }
        unset($prev['api_key'], $prev['api_secret']);
        $json = GpDb::storedWalletValue($methodCode, 'options', json_encode($prev, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $now = GpIds::now();
        if ($existing) {
            GpDb::exec(
                'UPDATE gp_methods SET options = ?, updated_at = ? WHERE brand_id = ? AND code = ?',
                [$json, $now, $brandId, $methodCode]
            );
            return;
        }
        GpDb::exec(
            'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
            [$brandId, $methodCode, 'inactive', $json, $now, $now]
        );
    }

    private static function nullableAmount(mixed $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        return GpMoney::sanitize((string) $v);
    }

    /** @return array{0:string,1:string} */
    private static function feeFromRequest(GpRequest $req, ?array $gw): array
    {
        $type = strtolower(trim((string) $req->input(
            'gatewayFeeType',
            $req->input('feeType', $gw['gateway_fee_type'] ?? 'percentage')
        )));
        if (!in_array($type, ['percentage', 'fixed'], true)) {
            GpJson::error('INVALID_FEE_TYPE', 'gatewayFeeType must be percentage or fixed.', 400);
        }
        $rawFee = $req->input('gatewayFee', $req->input('fee', null));
        if ($rawFee === null && $gw !== null) {
            $fee = self::nullableAmount($gw['gateway_fee'] ?? '0') ?? '0';
        } else {
            $fee = self::nullableAmount($rawFee) ?? '0';
        }
        if ((float) $fee < 0) {
            GpJson::error('INVALID_FEE', 'gatewayFee cannot be negative.', 400);
        }
        return [$fee, $type];
    }

    /** @param array<string,mixed> $opts */
    private static function applyFeeToOptions(array &$opts, string $fee, string $feeType): void
    {
        if ($feeType === 'fixed') {
            $opts['fixed_charge'] = $fee;
            $opts['percentage_charge'] = '0';
        } else {
            $opts['percentage_charge'] = $fee;
            $opts['fixed_charge'] = '0';
        }
    }

    private static function syncMethodFeesFromGateway(
        string $brandId,
        string $methodCode,
        string $fee,
        string $feeType,
        ?string $exchangeRate
    ): void {
        $existing = GpDb::one('SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, $methodCode]);
        $prev = [];
        if ($existing) {
            $decoded = json_decode((string) ($existing['options'] ?? ''), true);
            $prev = is_array($decoded) ? $decoded : [];
        }
        self::applyFeeToOptions($prev, $fee, $feeType);
        if ($exchangeRate !== null && $exchangeRate !== '' && (float) $exchangeRate > 0) {
            $prev['custom_rate_bdt'] = (float) $exchangeRate;
        }
        $json = GpDb::storedWalletValue($methodCode, 'options', json_encode($prev, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $now = GpIds::now();
        if ($existing) {
            GpDb::exec(
                'UPDATE gp_methods SET options = ?, updated_at = ? WHERE brand_id = ? AND code = ?',
                [$json, $now, $brandId, $methodCode]
            );
            return;
        }
        GpDb::exec(
            'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
            [$brandId, $methodCode, 'inactive', $json, $now, $now]
        );
    }

    private static function mirrorPrimaryMethod(string $brandId, string $methodCode): void
    {
        $primary = GpDb::one(
            'SELECT * FROM gp_gateways WHERE brand_id = ? AND method_code = ? AND status = ? ORDER BY display_order ASC, id ASC',
            [$brandId, $methodCode, 'active']
        );
        if ($primary === null) {
            $any = GpDb::one(
                'SELECT * FROM gp_gateways WHERE brand_id = ? AND method_code = ? ORDER BY display_order ASC, id ASC',
                [$brandId, $methodCode]
            );
            $acc = $any ? trim((string) ($any['account'] ?? '')) : '';
            $status = 'inactive';
        } else {
            $acc = trim((string) ($primary['account'] ?? ''));
            $status = 'active';
        }
        $existing = GpDb::one('SELECT id, options FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, $methodCode]);
        $opts = [];
        if ($existing) {
            $decoded = json_decode((string) ($existing['options'] ?? ''), true);
            $opts = is_array($decoded) ? $decoded : [];
        }
        if ($acc !== '') {
            $opts['account'] = $acc;
            $opts['depositAddressOrNumber'] = $acc;
        }
        $json = GpDb::storedWalletValue($methodCode, 'options', json_encode($opts, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        $now = GpIds::now();
        if ($existing) {
            GpDb::exec(
                'UPDATE gp_methods SET status = ?, options = ?, updated_at = ? WHERE brand_id = ? AND code = ?',
                [$status, $json, $now, $brandId, $methodCode]
            );
        } else {
            GpDb::exec(
                'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
                [$brandId, $methodCode, $status, $json, $now, $now]
            );
        }
    }

    private static function ensureBackfill(): void
    {
        // ensureExtras already backfills on boot; no-op hook for clarity
    }

    /** @param array{brand_id:string,merchant_id?:string} $actor */
    private static function audit(array $actor, string $action, array $meta): void
    {
        try {
            GpDb::exec(
                'INSERT INTO gp_audit_log (brand_id, session_id, actor_id, action, meta_json, created_at)
                 VALUES (?, NULL, ?, ?, ?, ?)',
                [
                    $actor['brand_id'],
                    $actor['merchant_id'] ?? null,
                    $action,
                    json_encode($meta, JSON_UNESCAPED_SLASHES),
                    GpIds::now(),
                ]
            );
        } catch (Throwable $e) {
            // non-fatal
        }
    }
}
