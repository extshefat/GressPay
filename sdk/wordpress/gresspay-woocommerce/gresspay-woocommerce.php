<?php
/**
 * Plugin Name: GressPay for WooCommerce
 * Plugin URI: https://github.com/extshefat/GressPay
 * Description: Accept payments via GressPay hosted checkout (create + verify API).
 * Version: 0.1.0
 * Author: GressPay
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * WC requires at least: 7.0
 * Text Domain: gresspay-woocommerce
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('GRESSPAY_WC_VERSION', '0.1.0');
define('GRESSPAY_WC_PATH', plugin_dir_path(__FILE__));

require_once GRESSPAY_WC_PATH . 'includes/class-gresspay-client.php';
require_once GRESSPAY_WC_PATH . 'includes/class-wc-gateway-gresspay.php';

add_filter('woocommerce_payment_gateways', static function (array $methods): array {
    $methods[] = 'WC_Gateway_GressPay';
    return $methods;
});

add_action('plugins_loaded', static function (): void {
    if (!class_exists('WooCommerce')) {
        return;
    }
    load_plugin_textdomain('gresspay-woocommerce', false, dirname(plugin_basename(__FILE__)) . '/languages');
});
