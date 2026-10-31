# GressPay for WooCommerce

Starter plugin that redirects WooCommerce checkout to **GressPay hosted checkout** using the same REST flow as `sdk/php/`.

## Requirements

- WordPress 6+
- WooCommerce 7+
- PHP 8.0+
- A GressPay **website API key** (`gp_live_…`) from Dashboard → Brands

## Install

1. Download `gresspay-woocommerce.zip` from the GressPay dashboard (**Apps & Plugins**) or build locally:

   ```bash
   cd sdk/wordpress
   zip -r ../../public/download/gresspay-woocommerce.zip gresspay-woocommerce
   ```

2. WordPress admin → **Plugins → Add New → Upload Plugin** → choose the zip → Activate.

3. WooCommerce → **Settings → Payments → GressPay** → enable and paste your API key.

## Flow

1. Buyer chooses GressPay at checkout.
2. Plugin calls `POST /api/v1/payment/create` and redirects to `payment_url`.
3. On return, plugin calls `POST /api/v1/payment/verify` with `sessionId` before marking the order paid.

## Webhooks

For production, also verify `payment.completed` webhooks on your server (see main GressPay API docs). This scaffold focuses on redirect + verify.

## Files

- `gresspay-woocommerce.php` — bootstrap
- `includes/class-gresspay-client.php` — minimal HTTP client (`wp_remote_post`)
- `includes/class-wc-gateway-gresspay.php` — WooCommerce gateway class
