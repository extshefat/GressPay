<?php
declare(strict_types=1);

final class MethodsController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireActor($req);
        GpAuth::requireScope($actor, 'manage_methods');
        GpRateLimiter::guard('methods:' . $actor['brand_id'], 60, 60);
        $code = $req->part(1) !== null ? GpCatalog::publicCode($req->part(1)) : null;
        $action = $req->part(2);
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$actor['brand_id']]);

        if ($req->method === 'GET' && $code === null) {
            if (GpAuth::activeBrandId($actor) === '') {
                $list = [];
                foreach (GpCatalog::methods() as $cat) {
                    if (!GpCatalog::isPlatformEnabled($cat['code'])) { continue; }
                    $list[] = GpPresenters::method($cat, null, [], null);
                }
                GpJson::send(['methods' => $list, 'noBrand' => true]);
            }
            $connected = GpDb::all('SELECT * FROM gp_methods WHERE brand_id = ?', [$actor['brand_id']]);
            $map = [];
            foreach ($connected as $row) {
                $map[GpCatalog::publicCode($row['code'])] = $row;
            }
            $list = [];
            foreach (GpCatalog::methods() as $cat) {
                if (!GpCatalog::isPlatformEnabled($cat['code'])) { continue; }
                $list[] = GpPresenters::method($cat, $map[$cat['code']] ?? null, ['brandId' => $actor['brand_id']], $brand);
            }
            GpJson::send(['methods' => $list]);
        }

        if ($code === null) {
            GpJson::error('MISSING_CODE', 'Method code required.');
        }
        $cat = GpCatalog::find($code);
        if ($cat === null) {
            GpJson::error('UNKNOWN_METHOD', 'Unknown payment method.');
        }
        if (!GpCatalog::isPlatformEnabled($code)) { GpJson::error('METHOD_DISABLED', 'This payment method has been disabled platform-wide.'); }

        $enable = null;
        if ($req->method === 'PUT' || $req->method === 'POST') {
            if ($req->method === 'PUT' || $action === 'connect' || $action === null) {
                $flag = $req->input('isEnabled', $req->input('enabled', true));
                $enable = !($flag === false || $flag === 'false' || $flag === 0 || $flag === '0');
                if ($req->method === 'POST' && $action === 'connect') {
                    $enable = true;
                }
            }
        }
        if ($req->method === 'DELETE') {
            $enable = false;
        }

        if ($enable !== null) {
            $now = GpIds::now();
            $existing = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$actor['brand_id'], $code]);
            $status = $enable ? 'active' : 'inactive';
            $optsIn = $req->input('options', null);
            $json = $existing['options'] ?? '{}';
            if (is_array($optsIn)) {
                $forbidden = ['apiKey', 'secret', 'apiSecret', 'certificateSn', 'binance_pay_json', 'privateKey'];
                foreach ($forbidden as $bad) {
                    if (array_key_exists($bad, $optsIn)) {
                        GpJson::error('REJECTED_FIELD', 'Provider secrets cannot be set via method options. Use dedicated endpoints.', 400);
                    }
                }
                $prev = json_decode((string) $json, true);
                if (!is_array($prev)) {
                    $prev = [];
                }
                if ($code === 'binance_pay') {
                    foreach (['api_key', 'api_secret'] as $secretKey) {
                        if (!array_key_exists($secretKey, $optsIn)) {
                            continue;
                        }
                        $secret = trim((string) $optsIn[$secretKey]);
                        unset($optsIn[$secretKey]);
                        if ($secret === '') {
                            continue;
                        }
                        $prev[$secretKey . '_sealed'] = GpCrypto::seal($secret);
                        unset($prev[$secretKey]);
                    }
                }
                $allowed = [
                    'account', 'depositAddressOrNumber', 'mobile_number',
                    'bybit_uid', 'wallet_address', 'account_name',
                    'mode', 'binance_uid', 'custom_rate_bdt',
                ];
                foreach ($allowed as $k) {
                    if (array_key_exists($k, $optsIn)) {
                        $val = $optsIn[$k];
                        if ($val === null || $val === '') {
                            unset($prev[$k]);
                            continue;
                        }
                        $prev[$k] = is_string($val) ? trim($val) : $val;
                    }
                }
                if (isset($prev['mode'])) {
                    $mode = strtolower(trim((string) $prev['mode']));
                    if (!in_array($mode, ['merchant', 'personal'], true)) {
                        GpJson::error('INVALID_MODE', 'Binance mode must be merchant or personal.', 400);
                    }
                    $prev['mode'] = $mode;
                }
                if (isset($prev['custom_rate_bdt']) && (float) $prev['custom_rate_bdt'] <= 0) {
                    GpJson::error('INVALID_RATE', 'custom_rate_bdt must be a positive BDT per USDT rate.', 400);
                }
                $uid = '';
                if ($code === 'bybit_pay') {
                    $uid = trim((string) ($prev['bybit_uid'] ?? $prev['account'] ?? ''));
                    if ($uid !== '') {
                        $prev['bybit_uid'] = $uid;
                        if (trim((string) ($prev['account'] ?? '')) === '') {
                            $prev['account'] = $uid;
                        }
                    }
                }
                if ($code === 'binance_pay') {
                    $uid = trim((string) ($prev['binance_uid'] ?? ''));
                    if ($uid !== '') {
                        $prev['binance_uid'] = $uid;
                    }
                }
                if ($uid !== '') {
                    self::assertUidFree($actor['brand_id'], $uid, $code);
                }
                // Normalize destination into account for consistency.
                $dest = trim((string) ($prev['account'] ?? $prev['depositAddressOrNumber'] ?? $prev['mobile_number'] ?? ''));
                if ($dest !== '') {
                    $dest = self::validateDestination($code, $dest);
                    $prev['account'] = $dest;
                    $prev['depositAddressOrNumber'] = $dest;
                } else {
                    unset($prev['account'], $prev['depositAddressOrNumber'], $prev['mobile_number']);
                }
                $json = json_encode($prev, JSON_UNESCAPED_SLASHES);
            }

            $optsArr = json_decode((string) $json, true);
            if (!is_array($optsArr)) {
                $optsArr = [];
            }
            $hasDest = trim((string) ($optsArr['account'] ?? $optsArr['depositAddressOrNumber'] ?? $optsArr['mobile_number'] ?? '')) !== '';

            if ($code === 'binance_pay') {
                // Destination not applicable; enable only tracks merchant intent — liveReady still needs sealed creds.
            } elseif ($enable && in_array($code, ['bkash', 'nagad', 'rocket', 'upay', 'cellfin', 'usdt_trc20', 'bybit_pay'], true) && !$hasDest) {
                GpJson::error('DESTINATION_REQUIRED', 'Save a receiving number/address before enabling this rail.', 400);
            }

            if ($existing) {
                GpDb::exec(
                    'UPDATE gp_methods SET status = ?, options = ?, updated_at = ? WHERE brand_id = ? AND code = ?',
                    [$status, $json, $now, $actor['brand_id'], $code]
                );
            } else {
                GpDb::exec(
                    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [$actor['brand_id'], $code, $status, $json, $now, $now]
                );
            }
            self::audit($actor, 'methods.update', ['code' => $code, 'enabled' => $enable]);
            $row = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$actor['brand_id'], $code]);
            $presented = GpPresenters::method($cat, $row, ['brandId' => $actor['brand_id']], $brand);
            GpJson::send(['method' => $presented, 'isEnabled' => $enable]);
        }

        GpJson::error('METHOD_NOT_ALLOWED', 'Unsupported method.', 405);
    }

    private static function validateDestination(string $code, string $dest): string
    {
        if (in_array($code, ['bkash', 'nagad', 'upay', 'cellfin'], true)) {
            $digits = preg_replace('/\D+/', '', $dest) ?? '';
            // Bangladesh mobile: 01XXXXXXXXX (11 digits) or 8801XXXXXXXXX
            if (preg_match('/^8801[3-9]\d{8}$/', $digits)) {
                return '0' . substr($digits, 3);
            }
            if (preg_match('/^01[3-9]\d{8}$/', $digits)) {
                return $digits;
            }
            GpJson::error('INVALID_ACCOUNT', 'Enter a valid Bangladesh mobile number (01XXXXXXXXX).', 400);
        }
        if ($code === 'rocket') {
            $digits = preg_replace('/\D+/', '', $dest) ?? '';
            if (preg_match('/^8801[3-9]\d{8,9}$/', $digits)) {
                return '0' . substr($digits, 3);
            }
            if (preg_match('/^01[3-9]\d{8,9}$/', $digits)) {
                return $digits;
            }
            GpJson::error('INVALID_ACCOUNT', 'Enter a valid Rocket account number (11 or 12 digits).', 400);
        }
        if ($code === 'bybit_pay') {
            $cleaned = trim($dest);
            if (strlen($cleaned) < 4 || strlen($cleaned) > 50) {
                GpJson::error('INVALID_ACCOUNT', 'Enter a valid Bybit UID or Account ID.', 400);
            }
            return $cleaned;
        }
        if ($code === 'usdt_trc20') {
            $norm = TronUsdtVerifier::normalizeBase58($dest);
            if ($norm === '' || !str_starts_with($norm, 'T')) {
                GpJson::error('INVALID_ADDRESS', 'Enter a valid TRON Base58Check address (starts with T).', 400);
            }
            // Reject confusing the USDT contract with a receive address.
            $contract = TronUsdtVerifier::normalizeBase58(GpConfig::usdtTrc20Contract());
            if ($contract !== '' && $norm === $contract) {
                GpJson::error('INVALID_ADDRESS', 'That is the USDT contract address, not your receiving wallet.', 400);
            }
            return $norm;
        }
        return $dest;
    }

    /** A UID may be saved once per brand. The row being edited is excluded. */
    private static function assertUidFree(string $brandId, string $uid, string $code): void
    {
        $uid = trim($uid);
        if ($uid === '') {
            return;
        }
        $gateways = GpDb::all(
            'SELECT method_code, account FROM gp_gateways WHERE brand_id = ?',
            [$brandId]
        );
        foreach ($gateways as $row) {
            if ((string) ($row['method_code'] ?? '') === $code) {
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
            if ((string) ($row['code'] ?? '') === $code) {
                continue;
            }
            $opts = json_decode((string) ($row['options'] ?? ''), true);
            if (!is_array($opts)) {
                continue;
            }
            foreach (['bybit_uid', 'binance_uid', 'account'] as $key) {
                if (strcasecmp(trim((string) ($opts[$key] ?? '')), $uid) === 0 && trim((string) ($opts[$key] ?? '')) !== '') {
                    GpJson::error('UID_IN_USE', 'That UID is already saved on this brand.', 409);
                }
            }
        }
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
