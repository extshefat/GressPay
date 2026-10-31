<?php
declare(strict_types=1);

/**
 * WooCommerce payment gateway — redirects buyers to GressPay hosted checkout.
 */
final class WC_Gateway_GressPay extends WC_Payment_Gateway
{
    public function __construct()
    {
        $this->id = 'gresspay';
        $this->method_title = __('GressPay', 'gresspay-woocommerce');
        $this->method_description = __('Redirect to GressPay hosted checkout. Uses your brand website API key.', 'gresspay-woocommerce');
        $this->has_fields = false;
        $this->supports = ['products'];

        $this->init_form_fields();
        $this->init_settings();

        $this->title = $this->get_option('title', 'GressPay');
        $this->description = $this->get_option('description', 'Pay securely via GressPay.');
        $this->enabled = $this->get_option('enabled', 'no');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        add_action('woocommerce_api_wc_gateway_gresspay_return', [$this, 'handle_return']);
    }

    public function init_form_fields(): void
    {
        $this->form_fields = [
            'enabled' => [
                'title' => __('Enable/Disable', 'gresspay-woocommerce'),
                'type' => 'checkbox',
                'label' => __('Enable GressPay', 'gresspay-woocommerce'),
                'default' => 'no',
            ],
            'title' => [
                'title' => __('Title', 'gresspay-woocommerce'),
                'type' => 'text',
                'default' => 'GressPay',
            ],
            'description' => [
                'title' => __('Description', 'gresspay-woocommerce'),
                'type' => 'textarea',
                'default' => 'You will be redirected to GressPay to complete payment.',
            ],
            'api_key' => [
                'title' => __('Website API key', 'gresspay-woocommerce'),
                'type' => 'password',
                'description' => __('Live key from GressPay Dashboard → Brands (gp_live_…).', 'gresspay-woocommerce'),
            ],
            'create_url' => [
                'title' => __('Create payment URL', 'gresspay-woocommerce'),
                'type' => 'text',
                'default' => 'https://gresspay.extxcheats.com/api/v1/payment/create',
            ],
            'verify_url' => [
                'title' => __('Verify payment URL', 'gresspay-woocommerce'),
                'type' => 'text',
                'default' => 'https://gresspay.extxcheats.com/api/v1/payment/verify',
            ],
        ];
    }

    public function process_payment($order_id): array
    {
        $order = wc_get_order($order_id);
        if (!$order instanceof WC_Order) {
            wc_add_notice(__('Invalid order.', 'gresspay-woocommerce'), 'error');
            return ['result' => 'failure'];
        }

        $apiKey = (string) $this->get_option('api_key', '');
        if ($apiKey === '') {
            wc_add_notice(__('GressPay is not configured.', 'gresspay-woocommerce'), 'error');
            return ['result' => 'failure'];
        }

        try {
            $client = new GressPay_WC_Client(
                $apiKey,
                (string) $this->get_option('create_url'),
                (string) $this->get_option('verify_url')
            );
            $currency = $order->get_currency();
            $payload = [
                'amount' => (float) $order->get_total(),
                'currency' => $currency,
                'order_title' => sprintf('Order #%s', $order->get_order_number()),
                'email' => $order->get_billing_email(),
                'mobile' => $order->get_billing_phone(),
                'return_url' => $this->get_return_url($order),
                'metadata' => [
                    'woocommerce_order_id' => (string) $order->get_id(),
                ],
            ];
            $created = $client->createPayment($payload);
            $sessionId = (string) ($created['session_id'] ?? $created['sessionId'] ?? '');
            $paymentUrl = (string) ($created['payment_url'] ?? $created['paymentUrl'] ?? '');
            if ($sessionId === '' || $paymentUrl === '') {
                throw new RuntimeException('Missing session_id or payment_url from GressPay.');
            }
            $order->update_meta_data('_gresspay_session_id', $sessionId);
            $order->save();
            $order->update_status('pending', __('Awaiting GressPay payment.', 'gresspay-woocommerce'));
            return [
                'result' => 'success',
                'redirect' => $paymentUrl,
            ];
        } catch (Throwable $e) {
            wc_add_notice($e->getMessage(), 'error');
            return ['result' => 'failure'];
        }
    }

    public function handle_return(): void
    {
        $orderId = absint($_GET['order_id'] ?? 0);
        $order = wc_get_order($orderId);
        if (!$order instanceof WC_Order) {
            wp_safe_redirect(wc_get_checkout_url());
            exit;
        }
        $sessionId = (string) $order->get_meta('_gresspay_session_id');
        $apiKey = (string) $this->get_option('api_key', '');
        if ($sessionId === '' || $apiKey === '') {
            wc_add_notice(__('Payment session missing.', 'gresspay-woocommerce'), 'error');
            wp_safe_redirect($order->get_checkout_order_received_url());
            exit;
        }
        try {
            $client = new GressPay_WC_Client(
                $apiKey,
                (string) $this->get_option('create_url'),
                (string) $this->get_option('verify_url')
            );
            $verified = $client->verifyPayment($sessionId);
            $status = strtolower((string) ($verified['status'] ?? ''));
            if ($status === 'completed' || $status === 'paid') {
                $order->payment_complete($sessionId);
            } else {
                wc_add_notice(__('Payment not completed yet.', 'gresspay-woocommerce'), 'notice');
            }
        } catch (Throwable $e) {
            wc_add_notice($e->getMessage(), 'error');
        }
        wp_safe_redirect($order->get_checkout_order_received_url());
        exit;
    }
}
