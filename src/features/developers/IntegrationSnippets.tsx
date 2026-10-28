"use client";

const HOST = "https://gresspay.extxcheats.com/api/v1";

const curl = `curl -X POST ${HOST}/payment/create \\
  -H "Authorization: Bearer gp_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "500.00",
    "currency": "BDT",
    "order_id": "order-1042",
    "customer_name": "Customer Name",
    "customer_email": "buyer@example.com",
    "success_url": "https://shop.example/paid",
    "cancel_url": "https://shop.example/cancel",
    "webhook_url": "https://shop.example/hooks/gresspay"
  }'`;

const php = `<?php
$ch = curl_init('${HOST}/payment/create');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . getenv('GRESSPAY_API_KEY'),
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'amount' => '500.00',
    'currency' => 'BDT',
    'order_id' => 'order-1042',
    'customer_name' => 'Customer Name',
    'customer_email' => 'buyer@example.com',
    'success_url' => 'https://shop.example/paid',
    'cancel_url' => 'https://shop.example/cancel',
    'webhook_url' => 'https://shop.example/hooks/gresspay',
  ]),
]);
$data = json_decode(curl_exec($ch), true);
header('Location: ' . $data['payment_url']);`;

const node = `const res = await fetch("${HOST}/payment/create", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.GRESSPAY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: "500.00",
    currency: "BDT",
    order_id: "order-1042",
    customer_name: "Customer Name",
    customer_email: "buyer@example.com",
    success_url: "https://shop.example/paid",
    cancel_url: "https://shop.example/cancel",
    webhook_url: "https://shop.example/hooks/gresspay",
  }),
});
const data = await res.json();
// Send the buyer to data.payment_url`;

const wp = `<?php
// WordPress / WooCommerce: call the same endpoint from the server, never from the browser.
$response = wp_remote_post('${HOST}/payment/create', [
  'headers' => [
    'Authorization' => 'Bearer ' . getenv('GRESSPAY_API_KEY'),
    'Content-Type' => 'application/json',
  ],
  'body' => wp_json_encode([
    'amount' => $order->get_total(),
    'currency' => 'BDT',
    'order_id' => (string) $order->get_id(),
    'customer_name' => $order->get_billing_first_name(),
    'customer_email' => $order->get_billing_email(),
    'success_url' => $order->get_checkout_order_received_url(),
    'cancel_url' => wc_get_checkout_url(),
    'webhook_url' => home_url('/wp-json/gresspay/v1/hook'),
  ]),
]);
$body = json_decode(wp_remote_retrieve_body($response), true);
wp_redirect($body['payment_url']);
exit;`;

function Block({ title, code }: { title: string; code: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</div>
      <pre className="overflow-x-auto border border-zinc-200 bg-zinc-950 p-4 text-xs text-zinc-100 dark:border-zinc-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function IntegrationSnippets() {
  return (
    <section id="integrate" className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">Integrate any website</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Create a session with your API key. Send the buyer to <span className="font-mono">payment_url</span>. The return URL is used only after the server has already marked the session paid. Verify with <span className="font-mono">POST /payment/verify</span> or <span className="font-mono">GET /payment/status/{"{session_id}"}</span>.
      </p>
      <Block title="cURL" code={curl} />
      <Block title="PHP" code={php} />
      <Block title="Node.js" code={node} />
      <Block title="WordPress" code={wp} />
    </section>
  );
}
