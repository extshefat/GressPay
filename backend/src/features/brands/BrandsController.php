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
            $out[] = [
                'brandId' => $row['brand_id'],
                'name' => $row['name'],
                'currencyCode' => $row['currency_code'] ?? 'BDT',
                'timezone' => $row['timezone'] ?? 'Asia/Dhaka',
                'webhookUrl' => $row['webhook_url'] ?? null,
                'active' => $row['brand_id'] === $actor['brand_id'],
                'deviceCount' => $deviceCount,
                'gatewayCount' => $gwCount,
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
        foreach (['bkash', 'nagad', 'rocket', 'upay', 'cellfin', 'usdt_trc20', 'binance_pay', 'bybit_pay'] as $code) {
            GpDb::exec(
                'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [$brandId, $code, 'inactive', '{}', $now, $now]
            );
        }
        GpAuth::issueKey($brandId, 'live', 'Website API key');

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
        GpJson::send([
            'brand' => [
                'brandId' => $brandId,
                'name' => $name,
                'webhookUrl' => $webhookUrl !== '' ? $webhookUrl : null,
            ],
        ]);
    }
}
