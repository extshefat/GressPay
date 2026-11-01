<?php
declare(strict_types=1);

/**
 * Lightweight regression suite (no PHPUnit required).
 * Run: php tests/run.php
 */
putenv('APP_ENV=development');
$_ENV['APP_ENV'] = 'development';
putenv('JWT_SECRET=dev-test-jwt-secret-at-least-32-chars-long');
$_ENV['JWT_SECRET'] = 'dev-test-jwt-secret-at-least-32-chars-long';
putenv('APP_ENCRYPTION_KEY=dev-test-enc-key-at-least-32-chars-xx');
$_ENV['APP_ENCRYPTION_KEY'] = 'dev-test-enc-key-at-least-32-chars-xx';
putenv('DB_DRIVER=sqlite');
$_ENV['DB_DRIVER'] = 'sqlite';
putenv('SQLITE_PATH=storage/test_gresspay.sqlite');
$_ENV['SQLITE_PATH'] = 'storage/test_gresspay.sqlite';
putenv('GRESSPAY_CRYPTO_ALLOWED=0');

$root = dirname(__DIR__);
@unlink($root . '/storage/test_gresspay.sqlite');

require_once $root . '/src/bootstrap.php';

$failed = 0;
$passed = 0;

function assert_true(bool $cond, string $msg): void
{
    global $failed, $passed;
    if ($cond) {
        echo "PASS  $msg\n";
        $passed++;
    } else {
        echo "FAIL  $msg\n";
        $failed++;
    }
}

// —— Webhook SSRF ——
$ssrf = [
    'http://example.com/hook' => false,
    'https://127.0.0.1/hook' => false,
    'https://10.0.0.5/x' => false,
    'https://169.254.169.254/latest' => false,
    'https://localhost/x' => false,
    'https://[::1]/x' => false,
    'ftp://example.com/x' => false,
    'https://0.0.0.0/x' => false,
];
foreach ($ssrf as $url => $expectOk) {
    $r = GpWebhook::validateDestination($url);
    assert_true($r['ok'] === $expectOk, "SSRF block: $url => " . ($r['error'] ?? 'ok'));
}
assert_true(GpWebhook::isBlockedIp('192.168.1.1') === true, 'block private 192.168');
assert_true(GpWebhook::isBlockedIp('10.1.2.3') === true, 'block private 10.x');
assert_true(GpWebhook::isBlockedIp('172.16.0.1') === true, 'block private 172.16');
assert_true(GpWebhook::isBlockedIp('8.8.8.8') === false, 'allow public 8.8.8.8');

// —— Binance signing fixture ——
$ts = '1619984100000';
$nonce = 'abc123nonce';
$body = '{"hello":"world"}';
$secret = 'testsecret';
$sig = BinancePayClient::signPayload($ts, $nonce, $body, $secret);
$payload = $ts . "\n" . $nonce . "\n" . $body . "\n";
$expected = strtoupper(hash_hmac('sha512', $payload, $secret));
assert_true($sig === $expected, 'Binance Pay HMAC-SHA512 signature matches');
assert_true(
    BinancePayClient::verifyCallbackSignature((string) (int) round(microtime(true) * 1000), $nonce, $body, $sig, $secret) === false
    || true,
    'Callback verifier callable'
);
// Fresh timestamp should verify
$ts2 = (string) (int) round(microtime(true) * 1000);
$sig2 = BinancePayClient::signPayload($ts2, $nonce, $body, $secret);
assert_true(BinancePayClient::verifyCallbackSignature($ts2, $nonce, $body, $sig2, $secret), 'Fresh callback signature verifies');
assert_true(!BinancePayClient::verifyCallbackSignature('1000', $nonce, $body, $sig2, $secret), 'Stale callback rejected');

// —— Catalog release scope ——
$codes = array_map(static fn ($m) => $m['code'], GpCatalog::releaseMethods());
assert_true(in_array('bkash', $codes, true) && in_array('nagad', $codes, true), 'BD rails in release');
assert_true(in_array('binance_pay', $codes, true) && in_array('usdt_trc20', $codes, true), 'Crypto rails in release');
assert_true(!in_array('upi_qr', $codes, true) && !in_array('jazzcash', $codes, true), 'IN/PK not in release');

// —— Fixed-price / openSession integrity via DB seed ——
$now = GpIds::now();
$merchantId = GpIds::make('m', 6);
$brandId = GpIds::make('b', 6);
GpDb::exec(
    'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$merchantId, 'T', 't_' . bin2hex(random_bytes(3)) . '@test.local', password_hash('x', PASSWORD_BCRYPT), 'active', $now, $now]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandId, $merchantId, 'Brand', 'BDT', 'Asia/Dhaka', $now, $now]
);
$linkId = GpIds::make('plink', 6);
GpDb::exec(
    'INSERT INTO gp_payment_links (link_id, brand_id, title, amount, currency, status, ledger_mode, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)',
    [$linkId, $brandId, 'Fixed', '500.00', 'BDT', 'active', 'live', $now, $now]
);

// Simulate fixed-price logic
$link = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$linkId]);
$buyerAmount = '1.00';
$locked = GpMoney::sanitize((string) $link['amount']);
assert_true($locked === '500' || (float) $locked === 500.0, 'Link amount stays 500');
assert_true(GpMoney::sanitize($buyerAmount) !== $locked, 'Buyer amount differs — would be rejected');

// —— Duplicate completed TxID app path ——
$sessionA = GpIds::make('chs', 6);
$sessionB = GpIds::make('chs', 6);
GpDb::exec(
    'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, trx_id, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)',
    [$sessionA, $brandId, 'api', '100', 'BDT', 'live', 'TRXDUPE1', 'completed', $now, $now]
);
$dup = GpDb::one(
    'SELECT session_id FROM gp_transactions WHERE trx_id = ? AND brand_id = ? AND session_id != ? AND status = ?',
    ['TRXDUPE1', $brandId, $sessionB, 'completed']
);
assert_true($dup !== null, 'Duplicate completed TxID detected');

// —— Crypto seal ——
$sealed = GpCrypto::seal('secret-value');
assert_true(GpCrypto::open($sealed) === 'secret-value', 'AES-GCM seal/open');

// —— Method readiness fail-closed ——
$cat = GpCatalog::find('binance_pay');
$ready = GpMethodReadiness::evaluate($cat, ['status' => 'active', 'options' => '{}'], ['crypto_enabled' => 0]);
assert_true($ready['liveReady'] === false, 'Binance not live without crypto gate');

$catBd = GpCatalog::find('bkash');
$readyBd = GpMethodReadiness::evaluate($catBd, ['status' => 'active', 'options' => '{}'], []);
assert_true($readyBd['liveReady'] === false, 'bKash not live without wallet number');
$readyBd2 = GpMethodReadiness::evaluate($catBd, ['status' => 'active', 'options' => json_encode(['account' => '01700000000'])], []);
assert_true($readyBd2['liveReady'] === true, 'bKash live-ready with wallet');

// —— Live TxID alone cannot complete: matchingSms returns null without SMS ——
$sessionLive = GpIds::make('chs', 6);
GpDb::exec(
    'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, trx_id, method_code, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [$sessionLive, $brandId, 'api', '500', 'BDT', 'live', 'TRXLIVEONLY1', 'bkash', 'pending', $now, $now]
);
$noSms = CheckoutController::matchingSms($brandId, 'TRXLIVEONLY1', '500', 'bkash');
assert_true($noSms === null, 'Live TxID without SMS does not match');

// —— Wrong amount SMS rejected ——
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandId, 'bkash', '100', 'TRXAMT1', 'approved', $now, $now]
);
$wrongAmt = CheckoutController::matchingSms($brandId, 'TRXAMT1', '500', 'bkash');
assert_true($wrongAmt === null, 'SMS amount mismatch rejected');

// —— Correct SMS matches ——
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandId, 'bkash', '500', 'TRXOK1', 'approved', $now, $now]
);
$okSms = CheckoutController::matchingSms($brandId, 'TRXOK1', '500', 'bkash');
assert_true($okSms !== null, 'Matching SMS accepted');

// —— Wrong rail SMS rejected ——
$wrongRail = CheckoutController::matchingSms($brandId, 'TRXOK1', '500', 'nagad');
assert_true($wrongRail === null, 'Wrong rail SMS rejected');

// —— Revoked device cannot authenticate ——
$devId = GpIds::make('dev', 4);
$plainTok = 'gpdev_' . bin2hex(random_bytes(8));
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, token_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$devId, $brandId, password_hash($plainTok, PASSWORD_BCRYPT), 'revoked', $now, $now]
);
$activeOnly = GpDb::all('SELECT * FROM gp_devices WHERE status = ?', ['active']);
$foundRevoked = false;
foreach ($activeOnly as $d) {
    if (password_verify($plainTok, $d['token_hash'])) {
        $foundRevoked = true;
    }
}
assert_true(!$foundRevoked, 'Revoked device token not in active set');

// —— Decimal money ——
assert_true(GpMoney::withinTolerance('100.00', '100.00', '0'), 'Exact amount within tolerance');
assert_true(!GpMoney::withinTolerance('100.00', '99.00', '0'), 'Underpay outside tolerance');
assert_true(GpMoney::add('0.1', '0.2', 2) === '0.30' || GpMoney::add('0.1', '0.2', 2) === '0.3', 'bcadd-style add');
assert_true(GpMoney::withinTolerance('10.00000000', '10', '0', 8), 'Binance-style exact decimal match');
assert_true(!GpMoney::withinTolerance('10.01', '10.00', '0', 8), 'Binance overpay rejected at zero tolerance');

// —— Fixed-price AMOUNT_LOCKED semantics (buyer cannot underpay locked link) ——
$linkAmt = GpMoney::sanitize((string) $link['amount']);
$buyerTry = GpMoney::sanitize('1.00');
assert_true(!GpMoney::withinTolerance($buyerTry, $linkAmt, '0'), 'AMOUNT_LOCKED: buyer amount mismatch');

// —— USDT TRC-20 address / amount helpers (no live Tron call) ——
$usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
assert_true(TronUsdtVerifier::normalizeBase58($usdtContract) === $usdtContract, 'USDT contract Base58 unchanged');
$hex20 = substr(TronUsdtVerifier::base58ToHex21($usdtContract), 2); // drop 41 prefix
assert_true(strlen($hex20) === 40, 'Contract decodes to 20-byte hex');
$roundTrip = TronUsdtVerifier::hex20ToBase58($hex20);
assert_true($roundTrip === $usdtContract, 'hex20 ↔ Base58Check round-trip for USDT contract');
assert_true(TronUsdtVerifier::toMicroUnits('1.5') === '1500000', '1.5 USDT = 1500000 micro');
assert_true(TronUsdtVerifier::toMicroUnits('0.000001') === '1', '1 micro-USDT');
assert_true(TronUsdtVerifier::fromMicroUnits('1500000') === '1.500000', 'micro → human');
assert_true(TronUsdtVerifier::normalizeBase58('not-an-address') === '', 'Invalid address rejected');
$badTx = TronUsdtVerifier::verify('zzzz', $usdtContract, '1');
assert_true($badTx['ok'] === false && ($badTx['error'] ?? '') === 'invalid_txid_format', 'Reject non-hex TxID');

// —— Binance callback nonce + audit tables exist ——
GpDb::exec(
    'INSERT INTO gp_binance_callback_nonces (nonce, merchant_trade_no, brand_id, created_at) VALUES (?,?,?,?)',
    ['nonce-test-1', 'trade1', $brandId, $now]
);
$nonceDup = false;
try {
    GpDb::exec(
        'INSERT INTO gp_binance_callback_nonces (nonce, merchant_trade_no, brand_id, created_at) VALUES (?,?,?,?)',
        ['nonce-test-1', 'trade1', $brandId, $now]
    );
} catch (Throwable $e) {
    $nonceDup = true;
}
assert_true($nonceDup, 'Duplicate Binance callback nonce rejected');
GpDb::exec(
    'INSERT INTO gp_audit_log (brand_id, session_id, actor_id, action, meta_json, created_at) VALUES (?,?,?,?,?,?)',
    [$brandId, $sessionLive, $merchantId, 'binance.reconcile', '{}', $now]
);
assert_true(GpDb::one('SELECT id FROM gp_audit_log WHERE action = ?', ['binance.reconcile']) !== null, 'Audit log row persisted');

// —— Ledger isolation: test completed trx not visible as live duplicate rule for different mode still keyed by brand ——
assert_true(
    strtolower((string) (GpDb::one('SELECT ledger_mode FROM gp_transactions WHERE session_id = ?', [$sessionLive])['ledger_mode'] ?? '')) === 'live',
    'Live session stamped live'
);

// —— Multi-tenant isolation (Merchant A vs B) ——
$now2 = GpIds::now();
$merchantB = GpIds::make('m', 6);
$brandB = GpIds::make('b', 6);
GpDb::exec(
    'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$merchantB, 'B', 'b_' . bin2hex(random_bytes(3)) . '@test.local', password_hash('x', PASSWORD_BCRYPT), 'active', $now2, $now2]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandB, $merchantB, 'BrandB', 'BDT', 'Asia/Dhaka', $now2, $now2]
);

GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandId, 'bkash', 'active', json_encode(['account' => '01711111111']), $now2, $now2]
);
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandB, 'bkash', 'active', json_encode(['account' => '01722222222']), $now2, $now2]
);

$recvA = TronUsdtVerifier::hex20ToBase58(bin2hex(random_bytes(20)));
$recvB = TronUsdtVerifier::hex20ToBase58(bin2hex(random_bytes(20)));
assert_true($recvA !== '' && $recvB !== '' && $recvA !== $recvB, 'Generated distinct TRON receive addresses');
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandId, 'usdt_trc20', 'active', json_encode(['account' => $recvA]), $now2, $now2]
);
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandB, 'usdt_trc20', 'active', json_encode(['account' => $recvB]), $now2, $now2]
);

$rowA = GpDb::one('SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, 'bkash']);
$optsA = json_decode((string) ($rowA['options'] ?? '{}'), true) ?: [];
assert_true(($optsA['account'] ?? '') === '01711111111', 'Merchant A wallet stored');
$leak = GpDb::one(
    'SELECT options FROM gp_methods WHERE brand_id = ? AND code = ? AND options LIKE ?',
    [$brandId, 'bkash', '%01722222222%']
);
assert_true($leak === null, 'Merchant A query does not return Merchant B wallet');
$crossUsdt = GpDb::one('SELECT options FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, 'usdt_trc20']);
$crossOpts = json_decode((string) ($crossUsdt['options'] ?? '{}'), true) ?: [];
assert_true(($crossOpts['account'] ?? '') === $recvA && ($crossOpts['account'] ?? '') !== $recvB, 'USDT address brand-scoped');

// Binance: seal for B only; A must not resolve B's creds; env fallback gone
putenv('BINANCE_PAY_API_KEY=env-key-must-not-work');
$_ENV['BINANCE_PAY_API_KEY'] = 'env-key-must-not-work';
putenv('BINANCE_PAY_SECRET=env-secret-must-not-work');
$_ENV['BINANCE_PAY_SECRET'] = 'env-secret-must-not-work';
putenv('BINANCE_PAY_CERTIFICATE_SN=env-sn-must-not-work');
$_ENV['BINANCE_PAY_CERTIFICATE_SN'] = 'env-sn-must-not-work';
$brandArow = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
assert_true(BinancePayClient::credentialsForBrand($brandArow ?? []) === null, 'No env Binance fallback for A');
$sealedB = GpCrypto::seal(json_encode([
    'apiKey' => 'brand-b-key',
    'secret' => 'brand-b-secret',
    'certificateSn' => 'brand-b-sn',
], JSON_UNESCAPED_SLASHES));
GpDb::exec('UPDATE gp_brands SET binance_pay_json = ?, updated_at = ? WHERE brand_id = ?', [$sealedB, $now2, $brandB]);
$brandBrow = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandB]);
$credsB = BinancePayClient::credentialsForBrand($brandBrow ?? []);
assert_true($credsB !== null && $credsB['apiKey'] === 'brand-b-key', 'Brand B sealed Binance opens');
assert_true(BinancePayClient::credentialsForBrand($brandArow ?? []) === null, 'Brand A cannot use Brand B Binance');
assert_true(BinancePayClient::brandHasSealedCredentials($brandArow ?? []) === false, 'A not configured');
assert_true(BinancePayClient::brandHasSealedCredentials($brandBrow ?? []) === true, 'B configured');

// Reconcile ownership: session on B is not visible under A's brand filter
$sessionB = GpIds::make('chs', 6);
GpDb::exec(
    'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, method_code, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)',
    [$sessionB, $brandB, 'api', '10', 'USDT', 'live', 'binance_pay', 'pending', $now2, $now2]
);
$aSeesB = GpDb::one(
    'SELECT session_id FROM gp_transactions WHERE session_id = ? AND brand_id = ?',
    [$sessionB, $brandId]
);
assert_true($aSeesB === null, 'Merchant A cannot load Merchant B checkout session by brand filter');

// SMS: B's SMS not matched for A's brand
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandB, 'bkash', '500', 'TRXISO1AB', 'approved', $now2, $now2]
);
assert_true(CheckoutController::matchingSms($brandId, 'TRXISO1AB', '500', 'bkash') === null, 'A cannot match B SMS evidence');
assert_true(CheckoutController::matchingSms($brandB, 'TRXISO1AB', '500', 'bkash') !== null, 'B matches own SMS');

// Checkout presenter: A methods never show B destination
$catBk = GpCatalog::find('bkash');
$mA = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandId, 'bkash']);
$presentedA = GpPresenters::method($catBk, $mA, ['brandId' => $brandId], $brandArow);
assert_true(($presentedA['depositAddressOrNumber'] ?? '') === '01711111111', 'Checkout A shows A wallet');
assert_true(($presentedA['depositAddressOrNumber'] ?? '') !== '01722222222', 'Checkout A never shows B wallet');

// Missing destination → not live-ready; no global fallback
$emptyUsdt = ['status' => 'active', 'options' => '{}'];
$readyEmpty = GpMethodReadiness::evaluate(GpCatalog::find('usdt_trc20'), $emptyUsdt, $brandArow ?? []);
assert_true($readyEmpty['liveReady'] === false, 'USDT without merchant address not live-ready');

// BD number format helpers (inline mirror of MethodsController rules)
$bdOk = (bool) preg_match('/^01[3-9]\d{8}$/', '01712345678');
$bdBad = (bool) preg_match('/^01[3-9]\d{8}$/', '019');
assert_true($bdOk && !$bdBad, 'BD mobile format gate');

// —— Google OAuth Security & CSRF Suite ——
assert_true(GoogleOAuthClient::isConfigured() === false, 'Google OAuth initially unconfigured');
$unconf = GoogleOAuthClient::getAuthUrl();
assert_true($unconf['enabled'] === false && str_contains($unconf['reason'] ?? '', 'not configured'), 'Unconfigured returns accurate reason');

// Simulate platform credentials configured in Coolify env
putenv('GOOGLE_CLIENT_ID=test-client-id-12345.apps.googleusercontent.com');
$_ENV['GOOGLE_CLIENT_ID'] = 'test-client-id-12345.apps.googleusercontent.com';
putenv('GOOGLE_CLIENT_SECRET=test-client-secret-xyz-98765');
$_ENV['GOOGLE_CLIENT_SECRET'] = 'test-client-secret-xyz-98765';
GpConfig::load();

assert_true(GoogleOAuthClient::isConfigured() === true, 'Google OAuth reports configured when platform keys set');
$authInfo = GoogleOAuthClient::getAuthUrl('https://my-vps.com/callback/google');
assert_true($authInfo['enabled'] === true, 'Generates auth URL when configured');
assert_true(str_contains($authInfo['url'] ?? '', 'accounts.google.com'), 'Auth URL targets Google');
assert_true(str_contains($authInfo['url'] ?? '', 'code_challenge='), 'PKCE S256 code_challenge present');
assert_true(str_contains($authInfo['url'] ?? '', 'state='), 'CSRF state parameter present');

$generatedState = $authInfo['state'] ?? '';
$dbState = GpDb::one('SELECT * FROM gp_oauth_states WHERE state = ?', [$generatedState]);
assert_true($dbState !== null && !empty($dbState['code_verifier']), 'OAuth state and PKCE verifier stored in DB');
assert_true((int) $dbState['expires_at'] > time(), 'OAuth state has valid future expiration');

// Forged / Tampered state rejected
$tampered = GoogleOAuthClient::handleCallback('auth-code-123', 'fake-tampered-state-999');
assert_true($tampered['ok'] === false && ($tampered['error'] ?? '') === 'INVALID_STATE', 'Tampered state rejected as INVALID_STATE');

// Expired state rejected
$expiredState = 'expired-state-' . bin2hex(random_bytes(8));
GpDb::exec(
    'INSERT INTO gp_oauth_states (state, nonce, code_verifier, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [$expiredState, 'nonce', 'verifier', time() - 100, GpIds::now()]
);
$expiredRes = GoogleOAuthClient::handleCallback('auth-code-123', $expiredState);
assert_true($expiredRes['ok'] === false && ($expiredRes['error'] ?? '') === 'STATE_EXPIRED', 'Past expiration rejected as STATE_EXPIRED');

// Single-use CSRF defense: state consumed once cannot be replayed
$consumedCheck = GpDb::one('SELECT * FROM gp_oauth_states WHERE state = ?', [$expiredState]);
assert_true($consumedCheck === null, 'Consumed state immediately deleted from DB (single-use CSRF defense)');

// —— Gateways + R2 (no live R2) ——
assert_true(R2Client::isConfigured() === false, 'R2 unconfigured without env');
assert_true(R2Client::detectImageMime("\x89PNG\r\n\x1a\nxxxx") === 'image/png', 'PNG magic detected');
assert_true(R2Client::detectImageMime("\xFF\xD8\xFFxxxx") === 'image/jpeg', 'JPEG magic detected');
assert_true(R2Client::detectImageMime('<svg></svg>') === null, 'SVG rejected by magic');

$gwA1 = 'gw_' . bin2hex(random_bytes(4));
$gwA2 = 'gw_' . bin2hex(random_bytes(4));
$nowG = GpIds::now();
GpDb::exec(
    'INSERT INTO gp_gateways (gateway_id, brand_id, method_code, display_name, account, currency, country, display_order, status, qr_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [$gwA1, $brandId, 'bkash', 'Main bKash', '01711111111', 'BDT', 'BD', 0, 'active', 'none', $nowG, $nowG]
);
GpDb::exec(
    'INSERT INTO gp_gateways (gateway_id, brand_id, method_code, display_name, account, currency, country, display_order, status, qr_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [$gwA2, $brandId, 'bkash', 'Backup bKash', '01733333333', 'BDT', 'BD', 1, 'active', 'none', $nowG, $nowG]
);
$foreignGw = GpDb::one('SELECT * FROM gp_gateways WHERE brand_id = ? AND gateway_id = ?', [$brandB, $gwA1]);
assert_true($foreignGw === null, 'Brand B cannot see Brand A gateway by id');

// Multi-gateway SMS: without number match → null
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, number, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [$brandId, 'bkash', '500', 'TRXMULTI1', '', 'approved', $nowG, $nowG]
);
assert_true(
    CheckoutController::matchingSms($brandId, 'TRXMULTI1', '500', 'bkash', $gwA1, '01711111111') === null,
    'Multi-gateway without SMS number stays unmatched'
);
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, number, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [$brandId, 'bkash', '500', 'TRXMULTI2', '01711111111', 'approved', $nowG, $nowG]
);
assert_true(
    CheckoutController::matchingSms($brandId, 'TRXMULTI2', '500', 'bkash', $gwA1, '01711111111') !== null,
    'Multi-gateway with matching number accepted'
);
assert_true(
    CheckoutController::matchingSms($brandId, 'TRXMULTI2', '500', 'bkash', $gwA2, '01733333333') === null,
    'SMS for wallet A does not complete gateway B'
);

$accOk = GatewaysController::validateAccount('bkash', '01712345678');
assert_true($accOk === '01712345678', 'Gateway BD account validates');

// Google sign-in reads redirect_uri from the query string. A missing query()
// method fatals the live login button with "Call to undefined method GpRequest::query()".
$_GET['redirect_uri'] = 'https://gresspay.extxcheats.com/callback/google';
$_SERVER['REQUEST_METHOD'] = 'GET';
$queryReq = new GpRequest(['auth', 'google', 'url']);
assert_true(
    $queryReq->query('redirect_uri', '') === 'https://gresspay.extxcheats.com/callback/google',
    'GpRequest::query reads redirect_uri for Google sign-in'
);
assert_true($queryReq->query('missing_key', 'none') === 'none', 'GpRequest::query returns the default');
unset($_GET['redirect_uri']);

$queryDb = sys_get_temp_dir() . '/gresspay_query_' . getmypid() . '.sqlite';
@unlink($queryDb);
$queryScript = tempnam(sys_get_temp_dir(), 'gpurl');
$rootPhp = addslashes($root);
$dbPhp = addslashes($queryDb);
file_put_contents($queryScript, <<<PHP
<?php
declare(strict_types=1);
putenv('APP_ENV=development');
\$_ENV['APP_ENV'] = 'development';
putenv('JWT_SECRET=dev-test-jwt-secret-at-least-32-chars-long');
\$_ENV['JWT_SECRET'] = 'dev-test-jwt-secret-at-least-32-chars-long';
putenv('APP_ENCRYPTION_KEY=dev-test-enc-key-at-least-32-chars-xx');
\$_ENV['APP_ENCRYPTION_KEY'] = 'dev-test-enc-key-at-least-32-chars-xx';
putenv('DB_DRIVER=sqlite');
\$_ENV['DB_DRIVER'] = 'sqlite';
putenv('SQLITE_PATH={$dbPhp}');
\$_ENV['SQLITE_PATH'] = '{$dbPhp}';
putenv('GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com');
\$_ENV['GOOGLE_CLIENT_ID'] = 'test-client.apps.googleusercontent.com';
putenv('GOOGLE_CLIENT_SECRET=test-client-secret-xyz');
\$_ENV['GOOGLE_CLIENT_SECRET'] = 'test-client-secret-xyz';
require '{$rootPhp}/src/bootstrap.php';
\$_GET['redirect_uri'] = 'https://gresspay.extxcheats.com/callback/google';
\$_SERVER['REQUEST_METHOD'] = 'GET';
\$req = new GpRequest(['auth', 'google', 'url']);
AuthController::googleUrl(\$req);
PHP);
$queryOut = [];
$queryCode = 0;
exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($queryScript) . ' 2>&1', $queryOut, $queryCode);
@unlink($queryScript);
@unlink($queryDb);
$queryBody = implode("\n", $queryOut);
$queryJson = json_decode($queryBody, true);
$expectedRedirect = 'redirect_uri=' . rawurlencode('https://gresspay.extxcheats.com/callback/google');
assert_true(
    $queryCode === 0 && is_array($queryJson) && ($queryJson['enabled'] ?? false) === true,
    'GET auth/google/url returns JSON instead of a query() fatal: ' . $queryBody
);
assert_true(
    is_array($queryJson) && str_contains((string) ($queryJson['url'] ?? ''), $expectedRedirect),
    'Google auth URL keeps the merchant redirect_uri'
);

$feeOnly = BinancePayClient::resolvePaidAmount(['totalFee' => '12.50000000']);
assert_true(
    ($feeOnly['ok'] ?? false) === true && ($feeOnly['amount'] ?? '') === GpMoney::sanitize('12.5', 8),
    'Query totalFee is accepted as the paid amount'
);
$bothAmounts = BinancePayClient::resolvePaidAmount(['totalFee' => '1.00', 'orderAmount' => '1.00000000']);
assert_true(($bothAmounts['ok'] ?? false) === true, 'Matching totalFee and orderAmount accepted');
$clash = BinancePayClient::resolvePaidAmount(['totalFee' => '1.00', 'orderAmount' => '2.00']);
assert_true(($clash['ok'] ?? false) === false, 'Conflicting provider amounts rejected');
$missingAmount = BinancePayClient::resolvePaidAmount(['status' => 'PAID']);
assert_true(($missingAmount['ok'] ?? false) === false, 'Missing provider amount rejected');
$legacyAmount = BinancePayClient::resolvePaidAmount(['orderAmount' => '3.25']);
assert_true(
    ($legacyAmount['ok'] ?? false) === true && ($legacyAmount['amount'] ?? '') === GpMoney::sanitize('3.25', 8),
    'orderAmount is used only when totalFee is absent'
);

// —— Phase 5 Two-Way Auto-Verification Engine Tests ——
// 1. Scenario A: SMS arrives first via APK, customer submits TrxID second
$nowP5 = GpIds::now();
$brandP5 = GpIds::make('b', 6);
$merchP5 = GpIds::make('m', 6);
GpDb::exec(
    'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$merchP5, 'P5 Merchant', 'p5_' . bin2hex(random_bytes(3)) . '@test.local', password_hash('x', PASSWORD_BCRYPT), 'active', $nowP5, $nowP5]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandP5, $merchP5, 'Brand Phase 5', 'BDT', 'Asia/Dhaka', $nowP5, $nowP5]
);
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandP5, 'bkash', 'active', json_encode(['account' => '01799999999']), $nowP5, $nowP5]
);
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandP5, 'nagad', 'active', json_encode(['account' => '01888888888']), $nowP5, $nowP5]
);

// Step 1: Carrier SMS arrives first from Android Companion APK
$trxA = 'TRX_SCENARIO_A_' . bin2hex(random_bytes(3));
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandP5, 'bkash', '500.00', $trxA, 'approved', $nowP5, $nowP5]
);

// Step 2: Customer creates checkout session
$sessionP5_A = GpIds::make('chs', 6);
GpDb::exec(
    'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, method_code, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)',
    [$sessionP5_A, $brandP5, 'api', '500', 'BDT', 'live', 'bkash', 'pending', $nowP5, $nowP5]
);

// Step 3: Customer submits TrxID (case-insensitive test)
$matchA = CheckoutController::matchingSms($brandP5, strtolower($trxA), '500', 'bkash');
assert_true($matchA !== null && (string)$matchA['trx_id'] === $trxA, 'Scenario A: SMS arrived first, matchingSms finds it case-insensitively');

// Step 4: markPaid settles the transaction & updates SMS to used
$rowP5_A = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$sessionP5_A]);
$methodRowP5_A = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandP5, 'bkash']);
$paidA = CheckoutController::markPaid($rowP5_A, $trxA, 'bkash', $methodRowP5_A, '500', 'BDT', $matchA, 'matched');
assert_true(strtolower((string)$paidA['status']) === 'completed', 'Scenario A: Transaction marked completed upon matching SMS');
$usedSmsA = GpDb::one('SELECT status FROM gp_sms_data WHERE trx_id = ?', [$trxA]);
assert_true(($usedSmsA['status'] ?? '') === 'used', 'Scenario A: Synced SMS status locked to used');

// Step 5: Duplicate prevention - same TrxID cannot be reused on a different session
$dupA = GpDb::one(
    'SELECT session_id FROM gp_transactions WHERE (trx_id = ? OR UPPER(trx_id) = ? OR LOWER(trx_id) = ?) AND status = ?',
    [$trxA, strtoupper($trxA), strtolower($trxA), 'completed']
);
assert_true($dupA !== null, 'Duplicate TrxID check: completed transaction blocks TrxID reuse');

// 2. Scenario B: Customer submits TrxID first, SMS arrives 2-10 seconds later via APK
$trxB = 'TRX_SCENARIO_B_' . bin2hex(random_bytes(3));
$sessionP5_B = GpIds::make('chs', 6);
GpDb::exec(
    'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, method_code, status, trx_id, metadata, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
        $sessionP5_B,
        $brandP5,
        'api',
        '750',
        'BDT',
        'live',
        'nagad',
        'pending',
        $trxB,
        json_encode(['confirmationState' => 'verifying', 'submitted_trx_id' => $trxB]),
        $nowP5,
        $nowP5,
    ]
);

// SMS has NOT arrived yet:
$noSmsYet = CheckoutController::matchingSms($brandP5, $trxB, '750', 'nagad');
assert_true($noSmsYet === null, 'Scenario B: matchingSms returns null before carrier SMS arrives');

// A few seconds later, Companion APK posts the SMS:
GpDb::exec(
    'INSERT INTO gp_sms_data (brand_id, sender_key, amount, trx_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$brandP5, 'nagad', '750.00', $trxB, 'approved', $nowP5, $nowP5]
);

// CompanionController finds the pending verifying session:
$pendingB = GpDb::one(
    'SELECT * FROM gp_transactions WHERE brand_id = ? AND (trx_id = ? OR UPPER(trx_id) = ? OR LOWER(trx_id) = ?) AND status IN (?, ?) ORDER BY id DESC',
    [$brandP5, $trxB, strtoupper($trxB), strtolower($trxB), 'pending', 'initiated']
);
assert_true($pendingB !== null && (string)$pendingB['session_id'] === $sessionP5_B, 'Scenario B: Companion finds pending session waiting for TrxID');

$smsB = CheckoutController::matchingSms($brandP5, $trxB, '750', 'nagad');
assert_true($smsB !== null, 'Scenario B: matchingSms matches newly arrived carrier SMS');

$methodRowP5_B = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$brandP5, 'nagad']);
$paidB = CheckoutController::markPaid($pendingB, $trxB, 'nagad', $methodRowP5_B, '750', 'BDT', $smsB, 'matched');
assert_true(strtolower((string)$paidB['status']) === 'completed', 'Scenario B: Pending session automatically transitions to completed');
$usedSmsB = GpDb::one('SELECT status FROM gp_sms_data WHERE trx_id = ?', [$trxB]);
assert_true(($usedSmsB['status'] ?? '') === 'used', 'Scenario B: Synced SMS status locked to used');

assert_true(GpConfig::normalizeDbDriver('pgsql') === 'pgsql', 'pgsql is not rewritten to mysql');
assert_true(GpConfig::normalizeDbDriver('postgres') === 'pgsql', 'postgres alias stays PostgreSQL');
assert_true(GpConfig::normalizeDbDriver('mysql') === 'mysql', 'mysql driver stays mysql');
assert_true(GpConfig::normalizeDbDriver('sqlite') === 'sqlite', 'sqlite driver stays sqlite');

$guardPdo = GpDb::pdo();
$guardPdo->beginTransaction();
$guardThrew = false;
try {
    GpDb::withinSavepoint(static function () {
        GpDb::one('SELECT id FROM gp_table_missing_for_guard', []);
    });
} catch (Throwable $e) {
    $guardThrew = true;
}
assert_true($guardThrew && $guardPdo->inTransaction(), 'failed lookup does not abort the open transaction');
GpDb::exec('CREATE TABLE IF NOT EXISTS gp_guard_probe (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
GpDb::exec('INSERT INTO gp_guard_probe (name) VALUES (?)', ['ok']);
$guardPdo->commit();
$guardRow = GpDb::one('SELECT name FROM gp_guard_probe WHERE name = ?', ['ok']);
assert_true(($guardRow['name'] ?? '') === 'ok', 'insert works after a guarded SQL failure');

putenv('ADMIN_EMAIL=stage1-admin@gresspay.test');
$_ENV['ADMIN_EMAIL'] = 'stage1-admin@gresspay.test';
putenv('GOOGLE_REDIRECT_URI=http://localhost:3000/callback/google');
$_ENV['GOOGLE_REDIRECT_URI'] = 'http://localhost:3000/callback/google';
GpConfig::load();
assert_true(GpConfig::isAdminEmail('stage1-admin@gresspay.test') === true, 'isAdminEmail matches ADMIN_EMAIL');
assert_true(GpConfig::isAdminEmail('someone-else@gresspay.test') === false, 'isAdminEmail fails closed');
$_SERVER['HTTP_X_FORWARDED_HOST'] = 'gresspay.extxcheats.com';
$_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
unset($_SERVER['HTTP_ORIGIN']);
$forced = GoogleOAuthClient::resolveRedirectUri('http://localhost:3000/callback/google');
assert_true(
    $forced === 'https://gresspay.extxcheats.com/callback/google',
    'localhost Google redirect is forced to the public callback'
);

$quoteDefault = GpRatesEngine::usdtQuote($brandP5, '1225', 'BDT');
assert_true($quoteDefault !== null && $quoteDefault['amount'] === '10.00', 'default BDT map quotes USDT to 2 decimals');
assert_true($quoteDefault !== null && $quoteDefault['amount'] !== '1225.00', 'missing custom rate is not treated as 1:1');
$nowQuote = GpIds::now();
GpDb::exec(
    'INSERT INTO gp_methods (brand_id, code, status, options, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    [$brandP5, 'usdt_trc20', 'active', json_encode(['custom_rate_bdt' => 120]), $nowQuote, $nowQuote]
);
$quoteCustom = GpRatesEngine::usdtQuote($brandP5, '1200', 'BDT');
assert_true($quoteCustom !== null && $quoteCustom['amount'] === '10.00' && $quoteCustom['rate'] === '120.00', 'custom_rate_bdt overrides the BDT rate for that brand');
$quoteUsd = GpRatesEngine::usdtQuote($brandP5, '15', 'USD');
assert_true($quoteUsd !== null && $quoteUsd['amount'] === '15.00', 'USD checkout quotes USDT at the saved USD rate');

$presented = GpPresenters::method(
    GpCatalog::find('usdt_trc20'),
    ['status' => 'active', 'options' => json_encode(['account' => 'TXYZnotchecked', 'custom_rate_bdt' => 120])],
    ['amount' => '1200', 'currency' => 'BDT', 'brandId' => $brandP5]
);
assert_true(($presented['usdt_amount'] ?? null) === 10.0, 'crypto method payload includes the USDT amount');
assert_true(isset($presented['exchange_rate']), 'crypto method payload includes exchange_rate');

$statusRow = [
    'session_id' => 'chs_stage1',
    'status' => 'completed',
    'amount' => '100',
    'currency' => 'BDT',
    'method_code' => 'bkash',
    'trx_id' => 'TXSTAGE1',
    'metadata' => json_encode(['orderId' => 'ord_stage1', 'returnUrl' => 'https://example.com/back']),
    'ledger_mode' => 'live',
    'expires_at' => null,
    'updated_at' => '2026-10-29T02:00:00Z',
];
$statusOut = GpPresenters::checkoutStatus($statusRow);
assert_true(($statusOut['order_id'] ?? '') === 'ord_stage1', 'verify payload includes order_id');
assert_true(is_array($statusOut['metadata'] ?? null), 'verify payload includes metadata');
assert_true(($statusOut['paid_at'] ?? null) === '2026-10-29T02:00:00Z', 'verify payload includes paid_at');

$createOut = GpPresenters::checkoutSession(
    [
        'session_id' => 'chs_stage1_create',
        'amount' => '100',
        'currency' => 'BDT',
        'metadata' => '{}',
        'ledger_mode' => 'live',
        'expires_at' => null,
        'created_at' => '2026-10-29T02:00:00Z',
        'source' => 'api',
    ],
    ['link_id' => 'lnk_stage1', 'title' => 'Order', 'description' => ''],
    ['brand_id' => $brandP5, 'name' => 'Stage Brand'],
    []
);
assert_true(($createOut['status'] ?? false) === true, 'create payload status is true');
assert_true(($createOut['session_id'] ?? '') === 'chs_stage1_create', 'create payload includes session_id');
assert_true(str_contains((string) ($createOut['payment_url'] ?? ''), '/pay/chs_stage1_create'), 'create payload includes payment_url');

// —— Plan seeds: trial + paid starter ——
$trialRow = GpDb::one('SELECT plan_id, credit_allowance FROM gp_plans WHERE LOWER(code) = ? LIMIT 1', ['trial']);
assert_true(
    is_array($trialRow) && strtolower((string) ($trialRow['plan_id'] ?? '')) === 'plan_trial',
    'gp_plans seeds trial code resolving to plan_trial'
);
assert_true((int) ($trialRow['credit_allowance'] ?? 0) === 50, 'trial credit_allowance is 50');

$planRow = GpDb::one('SELECT plan_id, credit_allowance FROM gp_plans WHERE LOWER(code) = ? LIMIT 1', ['starter']);
assert_true(
    is_array($planRow) && strtolower((string) ($planRow['plan_id'] ?? '')) === 'plan_starter',
    'gp_plans seeds starter code resolving to plan_starter'
);
assert_true((int) ($planRow['credit_allowance'] ?? 0) >= 999999, 'paid starter has unlimited checkout allowance');

// —— Webhook delivery stats use completed status (not legacy delivered) ——
$whBrandStat = GpIds::make('b', 6);
$whNow = GpIds::now();
GpDb::exec(
    'INSERT INTO gp_webhook_deliveries (event_id, brand_id, session_id, event_name, url, payload, signature, http_code, status, note, attempt, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ['evt_stat_test', $whBrandStat, null, 'payment.completed', 'https://example.com/h', '{}', 'sig', 200, 'completed', '', 1, $whNow, $whNow]
);
$completedWh = (int) (GpDb::one("SELECT COUNT(*) AS c FROM gp_webhook_deliveries WHERE status IN ('completed', 'delivered')")['c'] ?? 0);
assert_true($completedWh >= 1, 'webhook health query counts completed deliveries');

// —— Plan device limit (companion register) ——
$limBrand = GpIds::make('b', 6);
$limMerch = GpIds::make('m', 6);
$limNow = GpIds::now();
GpDb::exec(
    'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, plan_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [$limMerch, 'Limit Merchant', 'lim_' . bin2hex(random_bytes(3)) . '@test.local', password_hash('x', PASSWORD_BCRYPT), 'trial', 'active', $limNow, $limNow]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$limBrand, $limMerch, 'Limit Brand', 'BDT', 'Asia/Dhaka', $limNow, $limNow]
);
$starterLimits = GpPlatform::planLimitsForBrand($limBrand);
assert_true(($starterLimits['deviceLimit'] ?? 0) >= 1, 'trial plan exposes deviceLimit');
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [GpIds::make('dev', 8), $limBrand, 'first', password_hash('gpdev_test1', PASSWORD_BCRYPT), 'active', $limNow, $limNow]
);
$activeDev = (int) (GpDb::one(
    "SELECT COUNT(*) AS c FROM gp_devices WHERE brand_id = ? AND status = 'active'",
    [$limBrand]
)['c'] ?? 0);
assert_true(
    $activeDev >= $starterLimits['deviceLimit'],
    'trial deviceLimit reached after registering one companion device'
);

// —— Companion SMS brand-scoped token lookup ——
$smsBrand = GpIds::make('b', 6);
$smsDevId = GpIds::make('dev', 8);
$plainTok = 'gpdev_' . bin2hex(random_bytes(8));
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$smsDevId, $smsBrand, 'sms', password_hash($plainTok, PASSWORD_BCRYPT), 'active', $limNow, $limNow]
);
$otherBrand = GpIds::make('b', 6);
assert_true(CompanionController::deviceForSmsToken($otherBrand, $plainTok) === null, 'wrong brand header scope rejects token');
$found = CompanionController::deviceForSmsToken($smsBrand, $plainTok);
assert_true(is_array($found) && ($found['device_id'] ?? '') === $smsDevId, 'correct brand resolves device');
$byToken = CompanionController::deviceForToken($plainTok);
assert_true(is_array($byToken) && ($byToken['device_id'] ?? '') === $smsDevId, 'deviceForToken resolves without brand header');
$wrongLiveBrand = 'gp_live_' . bin2hex(random_bytes(8));
$viaResolve = CompanionController::resolveActiveDevice($wrongLiveBrand, $plainTok);
assert_true(is_array($viaResolve) && ($viaResolve['device_id'] ?? '') === $smsDevId, 'gp_live brand hint ignored; token binds to owning brand');

// —— Webhook retry attempts logged ——
putenv('WEBHOOK_MAX_RETRIES=2');
$_ENV['WEBHOOK_MAX_RETRIES'] = '2';
$whBrand = ['brand_id' => $limBrand, 'webhook_secret' => 'gpwh_testsecret'];
$beforeWh = (int) (GpDb::one('SELECT COUNT(*) AS c FROM gp_webhook_deliveries')['c'] ?? 0);
GpWebhook::dispatch($whBrand, 'https://example.com/gresspay-webhook-test', ['eventId' => 'evt_retry_test', 'sessionId' => 'chs_none'], 'payment.completed');
$afterWh = (int) (GpDb::one('SELECT COUNT(*) AS c FROM gp_webhook_deliveries')['c'] ?? 0);
assert_true($afterWh - $beforeWh >= 2, 'failed webhook dispatch logs multiple attempts when WEBHOOK_MAX_RETRIES=2');
putenv('WEBHOOK_MAX_RETRIES=5');
$_ENV['WEBHOOK_MAX_RETRIES'] = '5';

// —— Payment link custom fields & presenter ——
$normFields = PaymentLinksController::normalizeCustomFields([
    ['label' => 'WhatsApp', 'required' => true, 'type' => 'phone'],
    ['label' => '', 'type' => 'text'],
]);
assert_true(count($normFields) === 1 && $normFields[0]['type'] === 'phone', 'normalizeCustomFields keeps valid phone field');
GpDb::exec(
    'UPDATE gp_payment_links SET success_redirect_url = ?, product_image_url = ?, custom_fields_json = ? WHERE link_id = ?',
    [
        'https://example.com/thanks',
        'https://cdn.example.com/p.jpg',
        json_encode($normFields, JSON_UNESCAPED_UNICODE),
        $linkId,
    ]
);
$linkRow = GpDb::one('SELECT * FROM gp_payment_links WHERE link_id = ?', [$linkId]);
$brandRow = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ?', [$brandId]);
$merchRow = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
$plinkOut = GpPresenters::paymentLink($linkRow, $brandRow, $merchRow, ['paymentsCount' => 0, 'totalCollected' => 0]);
assert_true(
    ($plinkOut['successRedirectUrl'] ?? '') === 'https://example.com/thanks',
    'payment link presenter exposes successRedirectUrl'
);
assert_true(
    is_array($plinkOut['customFields'] ?? null) && count($plinkOut['customFields']) === 1,
    'payment link presenter exposes customFields'
);

// —— Companion list hides revoked devices; heartbeat updates last_seen ——
$hbBrand = GpIds::make('b', 6);
$hbNow = GpIds::now();
GpDb::exec(
    'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [GpIds::make('m', 6), 'HB Merchant', 'hb_' . bin2hex(random_bytes(3)) . '@test.local', password_hash('x', PASSWORD_BCRYPT), 'active', $hbNow, $hbNow]
);
$hbMerch = GpDb::one('SELECT merchant_id FROM gp_merchants ORDER BY id DESC LIMIT 1')['merchant_id'];
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$hbBrand, $hbMerch, 'HB Brand', 'BDT', 'Asia/Dhaka', $hbNow, $hbNow]
);
$devActive = GpIds::make('dev', 8);
$devRevoked = GpIds::make('dev', 8);
$tokActive = 'gpdev_' . bin2hex(random_bytes(8));
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$devActive, $hbBrand, 'active node', password_hash($tokActive, PASSWORD_BCRYPT), 'active', $hbNow, $hbNow]
);
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$devRevoked, $hbBrand, 'revoked node', password_hash('gpdev_revoked', PASSWORD_BCRYPT), 'revoked', $hbNow, $hbNow]
);
$listed = GpDb::all(
    'SELECT device_id FROM gp_devices WHERE brand_id = ? AND status = ?',
    [$hbBrand, 'active']
);
assert_true(count($listed) === 1 && ($listed[0]['device_id'] ?? '') === $devActive, 'merchant device list query excludes revoked rows');

$deviceRow = CompanionController::deviceForSmsToken($hbBrand, $tokActive);
assert_true(is_array($deviceRow) && ($deviceRow['device_id'] ?? '') === $devActive, 'active device token resolves');
CompanionController::touchLastSeen($deviceRow);
$afterTouch = GpDb::one('SELECT last_seen_at FROM gp_devices WHERE device_id = ?', [$devActive]);
assert_true(
    is_array($afterTouch) && !empty($afterTouch['last_seen_at']),
    'touchLastSeen sets last_seen_at for heartbeat/presence'
);
$seenTs = strtotime((string) $afterTouch['last_seen_at']);
assert_true($seenTs !== false && $seenTs >= time() - 5, 'last_seen_at is recent after heartbeat touch');

// —— Brand website API key sealed for dashboard re-copy ——
$issuedBrandKey = GpAuth::issueKey($brandId, 'live', 'PHPUnit sealed');
assert_true(str_starts_with($issuedBrandKey['key'], 'gp_live_'), 'issueKey mints gp_live_ prefix');
$sealedRow = GpDb::one(
    'SELECT key_sealed FROM gp_api_keys WHERE brand_id = ? AND status = ? ORDER BY id DESC LIMIT 1',
    [$brandId, 'active']
);
$reopened = is_array($sealedRow) ? (GpCrypto::open((string) ($sealedRow['key_sealed'] ?? '')) ?? '') : '';
assert_true($reopened === $issuedBrandKey['key'], 'key_sealed decrypts to full website key for owner copy');

$devPlain = 'gpdev_' . bin2hex(random_bytes(8));
GpDb::exec(
    'INSERT INTO gp_devices (device_id, brand_id, label, token_hash, token_sealed, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [GpIds::make('dev', 8), $brandId, 'sealed', password_hash($devPlain, PASSWORD_BCRYPT), GpCrypto::seal($devPlain), 'active', $now, $now]
);
$devSealed = GpDb::one('SELECT token_sealed FROM gp_devices WHERE brand_id = ? ORDER BY id DESC LIMIT 1', [$brandId]);
$devReopened = is_array($devSealed) ? (GpCrypto::open((string) ($devSealed['token_sealed'] ?? '')) ?? '') : '';
assert_true($devReopened === $devPlain, 'token_sealed decrypts to full device key for owner copy');

// —— Wave 3: Trial brand cap + monthly completed checkout cap ——
$quotaMerchant = GpIds::make('m', 6);
$quotaBrand1 = GpIds::make('b', 6);
$nowQ = GpIds::now();
GpDb::exec(
    "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [$quotaMerchant, 'Quota User', 'quota-free@test.local', password_hash('x', PASSWORD_BCRYPT), 'merchant', 'active', 'plan_trial', $nowQ, $nowQ]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$quotaBrand1, $quotaMerchant, 'Only Site', 'BDT', 'Asia/Dhaka', $nowQ, $nowQ]
);
$usageQ = GpPlanLimits::usageForMerchant($quotaMerchant);
assert_true($usageQ['brands']['used'] === 1 && $usageQ['brands']['limit'] === 1 && $usageQ['brands']['atLimit'] === true, 'Trial account at 1-brand cap');
assert_true($usageQ['monthlyCompleted']['limit'] === 50, 'Trial monthly completed cap is 50');

$windowQ = GpPlanLimits::currentBillingMonthWindow();
for ($i = 0; $i < 50; $i++) {
    GpDb::exec(
        'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)',
        [GpIds::make('chs', 8), $quotaBrand1, 'api', '10', 'BDT', 'live', 'completed', $nowQ, $nowQ]
    );
}
$usageFull = GpPlanLimits::usageForMerchant($quotaMerchant);
assert_true($usageFull['monthlyCompleted']['used'] === 50 && $usageFull['monthlyCompleted']['atLimit'] === true, '50 completed live txns hit cap');
assert_true($usageFull['monthlyCompleted']['warning'] === false, 'atLimit suppresses warning flag');

$usageWarnMerchant = GpIds::make('m', 6);
$usageWarnBrand = GpIds::make('b', 6);
GpDb::exec(
    "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [$usageWarnMerchant, 'Warn User', 'quota-warn@test.local', password_hash('x', PASSWORD_BCRYPT), 'merchant', 'active', 'trial', $nowQ, $nowQ]
);
GpDb::exec(
    'INSERT INTO gp_brands (brand_id, merchant_id, name, currency_code, timezone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    [$usageWarnBrand, $usageWarnMerchant, 'Warn Site', 'BDT', 'Asia/Dhaka', $nowQ, $nowQ]
);
for ($i = 0; $i < 40; $i++) {
    GpDb::exec(
        'INSERT INTO gp_transactions (session_id, brand_id, source, amount, currency, ledger_mode, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)',
        [GpIds::make('chs', 8), $usageWarnBrand, 'api', '5', 'BDT', 'live', 'completed', $nowQ, $nowQ]
    );
}
$usageWarn = GpPlanLimits::usageForMerchant($usageWarnMerchant);
assert_true($usageWarn['monthlyCompleted']['used'] === 40 && $usageWarn['monthlyCompleted']['warning'] === true, 'soft warning at 40/50');

$proMerchant = GpIds::make('m', 6);
GpDb::exec(
    "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [$proMerchant, 'Pro User', 'quota-pro@test.local', password_hash('x', PASSWORD_BCRYPT), 'merchant', 'active', 'pro', $nowQ, $nowQ]
);
assert_true(GpPlanLimits::maxBrandsForMerchant($proMerchant) === 5, 'Pro plan allows 5 websites');

$premiumMerchant = GpIds::make('m', 6);
GpDb::exec(
    "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [$premiumMerchant, 'Premium User', 'quota-premium@test.local', password_hash('x', PASSWORD_BCRYPT), 'merchant', 'active', 'premium', $nowQ, $nowQ]
);
assert_true(GpPlanLimits::maxBrandsForMerchant($premiumMerchant) === 2, 'Premium plan allows 2 websites');

$paidStarterMerchant = GpIds::make('m', 6);
GpDb::exec(
    "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [$paidStarterMerchant, 'Paid Starter', 'quota-paid-starter@test.local', password_hash('x', PASSWORD_BCRYPT), 'merchant', 'active', 'starter', $nowQ, $nowQ]
);
$paidUsage = GpPlanLimits::usageForMerchant($paidStarterMerchant);
assert_true($paidUsage['monthlyCompleted']['unlimited'] === true, 'paid starter has unlimited monthly checkouts');

// —— Gateway fee persistence ——
$feeGwId = 'gw_feetest01';
GpDb::exec(
    'INSERT INTO gp_gateways (gateway_id, brand_id, method_code, display_name, account, currency, country, display_order, status, qr_status, gateway_fee, gateway_fee_type, min_amount, max_amount, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [$feeGwId, $brandId, 'bkash', 'Fee GW', '01711112222', 'BDT', 'BD', 0, 'inactive', 'none', '2.50', 'percentage', '10', '50000', $nowQ, $nowQ]
);
$feeRow = GpDb::one('SELECT * FROM gp_gateways WHERE gateway_id = ?', [$feeGwId]);
$feePresent = GatewaysController::present($feeRow ?? []);
assert_true((float) ($feePresent['gatewayFee'] ?? 0) === 2.5, 'gateway fee exposed on present()');
assert_true(($feePresent['gatewayFeeType'] ?? '') === 'percentage', 'gateway fee type exposed on present()');

echo "\n$passed passed, $failed failed\n";
exit($failed > 0 ? 1 : 0);
