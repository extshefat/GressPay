# GressPay PHP library

Lightweight server-side helpers for **create payment** and **verify payment** against the GressPay REST API.

## Environment variables

```env
GRESSPAY_API_KEY=gp_live_…
GRESSPAY_CHECKOUT_URL=https://gresspay.extxcheats.com/api/v1/payment/create
GRESSPAY_VERIFY_URL=https://gresspay.extxcheats.com/api/v1/payment/verify
```

## Usage

```php
<?php
require __DIR__ . '/src/GressPayClient.php';

$gp = new GressPayClient();

$session = $gp->createPayment([
    'amount' => '500.00',
    'currency' => 'BDT',
    'order_id' => 'order-1042',
    'customer_name' => 'Customer Name',
    'customer_email' => 'buyer@example.com',
    'success_url' => 'https://shop.example/paid',
    'cancel_url' => 'https://shop.example/cancel',
    'webhook_url' => 'https://shop.example/hooks/gresspay',
]);

header('Location: ' . ($session['payment_url'] ?? $session['payUrl']));
```

After the buyer pays:

```php
$status = $gp->verifyPayment('chs_session_id_here');
// Fulfill order when status indicates COMPLETED
```

## WordPress / WooCommerce

A starter gateway plugin ships at [`sdk/wordpress/gresspay-woocommerce`](../wordpress/gresspay-woocommerce) and as [`/download/gresspay-woocommerce.zip`](../../public/download/gresspay-woocommerce.zip) from the dashboard Apps page. It creates a hosted checkout with your brand `gp_live_…` key and verifies on return.
