/**
 * Node 18+ — create hosted checkout and print payment URL.
 *
 *   GRESSPAY_API_KEY=gp_live_… node create-payment.mjs
 */

const apiKey = process.env.GRESSPAY_API_KEY;
const apiBase = (process.env.GRESSPAY_API_BASE ?? "https://gresspay.extxcheats.com/api/v1").replace(/\/$/, "");

if (!apiKey) {
  console.error("Set GRESSPAY_API_KEY to your brand website API key.");
  process.exit(1);
}

const payload = {
  amount: "500.00",
  currency: "BDT",
  order_id: `demo-${crypto.randomUUID().slice(0, 8)}`,
  customer_name: "Demo Buyer",
  customer_email: "buyer@example.com",
  success_url: "https://shop.example/paid",
  cancel_url: "https://shop.example/cancel",
  webhook_url: process.env.GRESSPAY_WEBHOOK_URL ?? "https://your-server.example/hooks/gresspay",
};

const res = await fetch(`${apiBase}/payment/create`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const data = await res.json();
if (!res.ok) {
  console.error(data);
  process.exit(1);
}

console.log(data.payment_url ?? data.payUrl);
