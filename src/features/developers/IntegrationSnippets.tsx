"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const HOST = "https://gresspay.extxcheats.com/api/v1";

type Lang = "curl" | "php" | "laravel" | "node" | "wordpress";

const SNIPPETS: Record<Lang, { label: string; code: string }> = {
  curl: {
    label: "cURL",
    code: `curl -X POST ${HOST}/payment/create \\
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
  }'`,
  },
  php: {
    label: "PHP",
    code: `<?php
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
header('Location: ' . ($data['payment_url'] ?? $data['payUrl']));`,
  },
  laravel: {
    label: "Laravel",
    code: `<?php
use Illuminate\\Support\\Facades\\Http;

$response = Http::withToken(config('services.gresspay.key'))
    ->post('${HOST}/payment/create', [
        'amount' => '500.00',
        'currency' => 'BDT',
        'order_id' => (string) $order->id,
        'customer_name' => $order->customer_name,
        'customer_email' => $order->customer_email,
        'success_url' => route('orders.paid', $order),
        'cancel_url' => route('checkout'),
        'webhook_url' => route('webhooks.gresspay'),
    ])
    ->throw()
    ->json();

return redirect()->away($response['payment_url'] ?? $response['payUrl']);`,
  },
  node: {
    label: "Node / Next.js",
    code: `const res = await fetch("${HOST}/payment/create", {
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
// Redirect the buyer to data.payment_url (alias: data.payUrl)`,
  },
  wordpress: {
    label: "WordPress / Woo",
    code: `<?php
// Call from the server (checkout handler / REST), never from the browser.
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
wp_redirect($body['payment_url'] ?? $body['payUrl']);
exit;`,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function IntegrationSnippets() {
  const [lang, setLang] = useState<Lang>("curl");
  const active = SNIPPETS[lang];

  return (
    <section id="snippets" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          Language examples
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create a session with your brand website API key (Dashboard → Brands), send the buyer to{" "}
          <code className="font-mono text-xs">payment_url</code>, then confirm
          with <code className="font-mono text-xs">POST /payment/verify</code> or{" "}
          <code className="font-mono text-xs">GET /payment/status/{"{session_id}"}</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
        {(Object.keys(SNIPPETS) as Lang[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setLang(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              lang === key
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {SNIPPETS[key].label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">
            {active.label}
          </span>
          <CopyButton text={active.code} />
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-100">
          <code>{active.code}</code>
        </pre>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">
            Verify payment status (merchant server)
          </span>
          <CopyButton
            text={`curl -s ${HOST}/checkout/verify-payment \\
  -H "Authorization: Bearer gp_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId":"chs_your_session_id"}'`}
          />
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-100">
          <code>{`// Buyer-facing status (public, no API key)
GET ${HOST}/checkout/{sessionId}/status

// Merchant verify by session id
POST ${HOST}/checkout/verify-payment
Authorization: Bearer gp_live_…
{ "sessionId": "chs_…" }`}</code>
        </pre>
      </div>
    </section>
  );
}
