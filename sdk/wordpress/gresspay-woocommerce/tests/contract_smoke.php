<?php
declare(strict_types=1);

/**
 * WooCommerce plugin contract smoke — no WordPress/WooCommerce runtime required.
 * Run: php sdk/wordpress/gresspay-woocommerce/tests/contract_smoke.php
 */
$failed = 0;
$passed = 0;

function assert_true(bool $ok, string $msg): void
{
    global $failed, $passed;
    if ($ok) {
        echo "PASS  $msg\n";
        $passed++;
    } else {
        echo "FAIL  $msg\n";
        $failed++;
    }
}

$root = dirname(__DIR__);
$gatewayFile = $root . '/includes/class-wc-gateway-gresspay.php';
$clientFile = $root . '/includes/class-gresspay-client.php';
$mainFile = $root . '/gresspay-woocommerce.php';

assert_true(is_file($gatewayFile), 'WC gateway class file exists');
assert_true(is_file($clientFile), 'GressPay WC client file exists');
assert_true(is_file($mainFile), 'Plugin bootstrap file exists');

$gatewaySrc = (string) file_get_contents($gatewayFile);
$clientSrc = (string) file_get_contents($clientFile);

assert_true(
    str_contains($gatewaySrc, '/api/v1/payment/create'),
    'Gateway default create_url targets /api/v1/payment/create'
);
assert_true(
    str_contains($gatewaySrc, '/api/v1/payment/verify'),
    'Gateway default verify_url targets /api/v1/payment/verify'
);
assert_true(
    preg_match("#https://gresspay\\.extxcheats\\.com/api/v1/payment/create#", $gatewaySrc) === 1,
    'Create payment default host matches production API shape'
);
assert_true(
    preg_match("#https://gresspay\\.extxcheats\\.com/api/v1/payment/verify#", $gatewaySrc) === 1,
    'Verify payment default host matches production API shape'
);

assert_true(
    str_contains($clientSrc, "'Authorization' => 'Bearer '"),
    'Client sends Authorization Bearer API key'
);
assert_true(str_contains($clientSrc, 'sessionId'), 'Verify payload uses sessionId');
assert_true(
    str_contains($gatewaySrc, 'woocommerce_api_wc_gateway_gresspay_return'),
    'Return handler hook registered for hosted checkout return'
);

// Load client with WordPress HTTP stubs — assert URL construction only.
if (!function_exists('wp_remote_post')) {
    function wp_remote_post($url, $args = [])
    {
        $GLOBALS['__gp_wc_last_request'] = ['url' => $url, 'args' => $args];
        return [
            'response' => ['code' => 200],
            'body' => json_encode(['ok' => true, 'session_id' => 'chs_test', 'payment_url' => 'https://example.test/pay/x']),
        ];
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error($thing): bool
    {
        return false;
    }
}
if (!function_exists('wp_remote_retrieve_response_code')) {
    function wp_remote_retrieve_response_code($response): int
    {
        return (int) ($response['response']['code'] ?? 0);
    }
}
if (!function_exists('wp_remote_retrieve_body')) {
    function wp_remote_retrieve_body($response): string
    {
        return (string) ($response['body'] ?? '');
    }
}
if (!function_exists('wp_json_encode')) {
    function wp_json_encode($data)
    {
        return json_encode($data);
    }
}

require_once $clientFile;
$client = new GressPay_WC_Client(
    'gp_live_smoke_test_key',
    'https://gresspay.extxcheats.com/api/v1/payment/create',
    'https://gresspay.extxcheats.com/api/v1/payment/verify'
);
$created = $client->createPayment(['amount' => '100', 'currency' => 'BDT']);
assert_true(($GLOBALS['__gp_wc_last_request']['url'] ?? '') === 'https://gresspay.extxcheats.com/api/v1/payment/create', 'createPayment posts to create URL');
$auth = (string) ($GLOBALS['__gp_wc_last_request']['args']['headers']['Authorization'] ?? '');
assert_true(str_starts_with($auth, 'Bearer gp_live_'), 'createPayment Authorization uses website API key');
assert_true(is_array($created) && ($created['ok'] ?? false) === true, 'createPayment returns decoded JSON body');

$verified = $client->verifyPayment('chs_smoke');
assert_true(($GLOBALS['__gp_wc_last_request']['url'] ?? '') === 'https://gresspay.extxcheats.com/api/v1/payment/verify', 'verifyPayment posts to verify URL');
$body = json_decode((string) ($GLOBALS['__gp_wc_last_request']['args']['body'] ?? '{}'), true);
assert_true(is_array($body) && ($body['sessionId'] ?? '') === 'chs_smoke', 'verifyPayment body includes sessionId');
assert_true(is_array($verified), 'verifyPayment returns decoded JSON body');

echo "\n$passed passed, $failed failed\n";
exit($failed > 0 ? 1 : 0);
