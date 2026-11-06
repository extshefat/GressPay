"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

function apiHost(): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (env) return `${env}/api/v1`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/v1`;
  }
  return "https://gresspay.extxcheats.com/api/v1";
}

type Lang = "curl" | "php" | "laravel" | "node" | "wordpress";

function buildSnippets(host: string): Record<Lang, { label: string; code: string }> {
  return {
    curl: {
      label: "cURL",
      code: `curl -X POST ${host}/payment/create \\
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
$ch = curl_init('${host}/payment/create');
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
    ->post('${host}/payment/create', [
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
      code: `const res = await fetch("${host}/payment/create", {
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
$response = wp_remote_post('${host}/payment/create', [
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
}

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
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-ink-solid px-2.5 py-1 text-[11px] font-medium text-on-ink hover:bg-ink-solid"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function IntegrationSnippets() {
  const [lang, setLang] = useState<Lang>("curl");
  const host = useMemo(() => apiHost(), []);
  const snippets = useMemo(() => buildSnippets(host), [host]);
  const active = snippets[lang];

  return (
    <section id="snippets" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white">
          Language examples
        </h2>
        <p className="mt-1 text-sm text-muted dark:text-muted">
          Create a session with your brand website API key (Dashboard → Brands), send the buyer to{" "}
          <code className="font-mono text-xs">payment_url</code>, then confirm with{" "}
          <code className="font-mono text-xs">POST /payment/verify</code> or{" "}
          <code className="font-mono text-xs">GET /payment/status/{"{session_id}"}</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 dark:border-border dark:bg-canvas">
        {(Object.keys(snippets) as Lang[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setLang(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              lang === key
                ? "bg-ink-solid text-white dark:bg-brand dark:text-on-brand"
                : "text-muted hover:text-ink dark:text-muted dark:hover:text-white"
            }`}
          >
            {snippets[key].label}
          </button>
        ))}
      </div>

      <div className="dark overflow-hidden rounded-xl border border-border bg-ink-solid">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            {active.label}
          </span>
          <CopyButton text={active.code} />
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-on-ink">
          <code>{active.code}</code>
        </pre>
      </div>

      <div className="dark overflow-hidden rounded-xl border border-border bg-ink-solid">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Verify payment status (your server)
          </span>
          <CopyButton
            text={`curl -s ${host}/checkout/verify-payment \\
  -H "Authorization: Bearer gp_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId":"chs_your_session_id"}'`}
          />
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-on-ink">
          <code>{`// Buyer-facing status (public, no API key)
GET ${host}/checkout/{sessionId}/status

// Verify by session id from your backend
POST ${host}/checkout/verify-payment
Authorization: Bearer gp_live_…
{ "sessionId": "chs_…" }`}</code>
        </pre>
      </div>
    </section>
  );
}
