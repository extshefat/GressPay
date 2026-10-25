"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import {
  Code2,
  Terminal,
  ShieldCheck,
  Webhook,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  FileCode,
  Download,
  AlertTriangle,
  Server,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function DevelopersPage() {
  const [activeLang, setActiveLang] = useState<"php" | "node" | "python">("node");
  const [activeTab, setActiveTab] = useState<"create" | "verify" | "webhook">("create");

  const phpSnippet = `<?php
// GressPay PHP Server-Side Integration (PHP 8.1+)
// NEVER expose your secret API key in browser JavaScript or client templates.

$apiKey = getenv('GRESSPAY_API_KEY') ?: 'gp_live_sk_...';
$baseUrl = 'https://api.yourdomain.com'; // Your GressPay instance URL

function createGressPayCheckout(float $amount, string $currency, string $orderId, string $customerEmail): array
{
    global $apiKey, $baseUrl;

    $payload = [
        'amount' => $amount,
        'currency' => $currency,
        'full_name' => 'Customer Name',
        'email' => $customerEmail,
        'return_url' => 'https://yoursite.com/checkout/success?order_id=' . urlencode($orderId),
        'webhook_url' => 'https://yoursite.com/api/webhooks/gresspay',
        'metadata' => ['orderId' => $orderId]
    ];

    $ch = curl_init($baseUrl . '/api/v1/checkout/create');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);
    if ($httpCode !== 201 || empty($data['payUrl'])) {
        throw new Exception("Checkout creation failed: " . ($data['error']['message'] ?? "HTTP $httpCode"));
    }

    // Redirect the buyer's browser to the returned hosted checkout URL
    return $data; // ['sessionId' => 'chs_...', 'payUrl' => 'https://.../pay/chs_...']
}

// Webhook Signature Verification (HMAC-SHA256 with Constant-Time Comparison)
function verifyWebhookSignature(string $rawBody, string $signatureHeader, string $webhookSecret): bool
{
    $expected = hash_hmac('sha256', $rawBody, $webhookSecret);
    return hash_equals($expected, $signatureHeader);
}

// Server-to-Server Payment Verification (Before Order Fulfillment)
function verifyPaymentStatus(string $sessionId): array
{
    global $apiKey, $baseUrl;

    $ch = curl_init($baseUrl . '/api/v1/checkout/verify-payment');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['sessionId' => $sessionId]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json'
        ]
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}`;

  const nodeSnippet = `// GressPay Node.js Server-Side Integration (Node 18+ / ESM)
// Read secret keys strictly from process.env — NEVER expose in frontend bundles.

import crypto from 'node:crypto';

const API_KEY = process.env.GRESSPAY_API_KEY; // 'gp_live_sk_...'
const BASE_URL = process.env.GRESSPAY_URL || 'https://api.yourdomain.com';
const WEBHOOK_SECRET = process.env.GRESSPAY_WEBHOOK_SECRET;

// 1. Create Checkout Session
export async function createCheckout(amount, currency, orderId, email) {
  const res = await fetch(\`\${BASE_URL}/api/v1/checkout/create\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      email,
      return_url: \`https://yoursite.com/orders/\${orderId}/complete\`,
      webhook_url: 'https://yoursite.com/api/webhooks/gresspay',
      metadata: { orderId },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || \`HTTP \${res.status}\`);
  }

  const session = await res.json();
  // Redirect buyer to session.payUrl
  return session; // { sessionId: 'chs_...', payUrl: 'https://.../pay/chs_...' }
}

// 2. Webhook Handler with Constant-Time Signature Verification
export function verifyWebhook(rawBodyBuffer, signatureHeader) {
  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBodyBuffer)
    .digest('hex');

  // Prevent timing attacks using crypto.timingSafeEqual
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'utf8'),
    Buffer.from(signatureHeader || '', 'utf8')
  );
}

// 3. Server-to-Server Payment Status Check
export async function checkPaymentStatus(sessionId) {
  const res = await fetch(\`\${BASE_URL}/api/v1/checkout/verify-payment\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  return res.json();
}`;

  const pythonSnippet = `# GressPay Python Server-Side Integration (Python 3.9+)
# Use requests / httpx with environment variables

import os
import hmac
import hashlib
import requests

API_KEY = os.environ.get("GRESSPAY_API_KEY", "gp_live_sk_...")
BASE_URL = os.environ.get("GRESSPAY_URL", "https://api.yourdomain.com")
WEBHOOK_SECRET = os.environ.get("GRESSPAY_WEBHOOK_SECRET", "")

def create_checkout(amount: float, currency: str, order_id: str, email: str) -> dict:
    """Create a GressPay checkout session and return payUrl."""
    payload = {
        "amount": amount,
        "currency": currency,
        "email": email,
        "return_url": f"https://yoursite.com/orders/{order_id}/thank-you",
        "webhook_url": "https://yoursite.com/api/webhooks/gresspay",
        "metadata": {"orderId": order_id}
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    r = requests.post(f"{BASE_URL}/api/v1/checkout/create", json=payload, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json() # Contains 'sessionId' and 'payUrl'

def verify_webhook_signature(raw_body_bytes: bytes, signature_header: str) -> bool:
    """Constant-time HMAC-SHA256 signature verification."""
    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        raw_body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature_header)

def verify_payment_status(session_id: str) -> dict:
    """Server-to-server query to confirm real payment status before fulfillment."""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    r = requests.post(
        f"{BASE_URL}/api/v1/checkout/verify-payment",
        json={"sessionId": session_id},
        headers=headers,
        timeout=10
    )
    r.raise_for_status()
    return r.json()`;

  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "GressPay Merchant REST API",
      version: "1.0.0",
      description: "Self-hosted international payment gateway supporting bKash, Nagad, Binance Pay, and USDT TRC-20.",
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/checkout/create": {
        post: {
          summary: "Create a hosted checkout session",
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount", "currency"],
                  properties: {
                    amount: { type: "number", example: 1500 },
                    currency: { type: "string", example: "BDT" },
                    full_name: { type: "string", example: "Ayesha Rahman" },
                    email: { type: "string", example: "ayesha@shop.bd" },
                    return_url: { type: "string", example: "https://shop.bd/order/1042" },
                    webhook_url: { type: "string", example: "https://shop.bd/api/webhook" },
                    metadata: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Session initialized successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      sessionId: { type: "string", example: "chs_98218a" },
                      payUrl: { type: "string", example: "https://gresspay.com/pay/chs_98218a" },
                      amount: { type: "number" },
                      currency: { type: "string" },
                      status: { type: "string", example: "PENDING" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/checkout/verify-payment": {
        post: {
          summary: "Verify payment status server-to-server",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sessionId"],
                  properties: { sessionId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Verified transaction payload",
            },
          },
        },
      },
    },
  };

  const downloadOpenApi = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(openApiSpec, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "gresspay-openapi.json");
    dlAnchorElem.click();
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Page Title & Intro */}
      <div className="space-y-4 mb-12">
        <div className="flex items-center gap-2">
          <Badge variant="cyan" dot>
            Developer Documentation
          </Badge>
          <Badge variant="slate">v1.0 REST API</Badge>
          <Badge variant="emerald">Free Beta</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          GressPay Integration Reference
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
          Complete guide to integrating GressPay server-to-server checkout, authenticating via scoped API keys, handling cryptographically signed HMAC webhooks, and reconciling payments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sticky Sidebar Navigation */}
        <div className="lg:col-span-3 sticky top-20 space-y-1 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium">
          <span className="text-[10px] font-mono uppercase text-zinc-400 px-3 py-1 block">
            Navigation Index
          </span>
          {[
            { id: "quickstart", label: "1. Quickstart & Prerequisites" },
            { id: "ledgers", label: "2. Test vs Live Ledgers" },
            { id: "auth", label: "3. Authentication & Scopes" },
            { id: "create-session", label: "4. Create Checkout Session" },
            { id: "verify-status", label: "5. Server-to-Server Verification" },
            { id: "webhooks", label: "6. Webhooks & HMAC Signatures" },
            { id: "code-examples", label: "7. Runnable Code Examples" },
            { id: "error-codes", label: "8. Error Codes & Diagnostics" },
            { id: "rails-models", label: "9. Rails & Verification Models" },
            { id: "go-live", label: "10. Production Go-Live Checklist" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block px-3 py-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              {item.label}
            </a>
          ))}

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={downloadOpenApi}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download OpenAPI 3.0
            </Button>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="lg:col-span-9 space-y-12">
          {/* Section 1: Quickstart */}
          <section id="quickstart" className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">01.</span> Quickstart & Prerequisites
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              GressPay follows standard RESTful principles. All requests require JSON content and return JSON responses. To start accepting payments, you need an active merchant account and an API Key.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Card className="p-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">API Base URL</span>
                <p className="font-mono text-[11px] text-[#077C74] dark:text-[#1BD1C0]">
                  https://your-domain.com/api/v1
                </p>
              </Card>
              <Card className="p-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">Live API Key</span>
                <p className="font-mono text-[11px] text-zinc-500">gp_live_sk_...</p>
              </Card>
              <Card className="p-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">Test API Key</span>
                <p className="font-mono text-[11px] text-zinc-500">gp_test_sk_...</p>
              </Card>
            </div>
          </section>

          {/* Section 2: Test vs Live Ledgers */}
          <section id="ledgers" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">02.</span> Test vs Live Ledgers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              GressPay enforces strict cryptographic and database separation between test and live environments. Test transactions are tagged with <code className="font-mono text-xs">ledger_mode = &apos;test&apos;</code> and will never affect production balances, merchant settlements, or carrier companion queues.
            </p>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-semibold">Security Rule:</span>
              <p className="leading-relaxed">
                Ledger mode is strictly determined by the authentication secret (<code className="font-mono">gp_live_</code> vs <code className="font-mono">gp_test_</code>). A buyer or client cannot switch ledger modes on the hosted pay page.
              </p>
            </div>
          </section>

          {/* Section 3: Authentication */}
          <section id="auth" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">03.</span> Authentication & Required Scopes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Send your secret key in the <code className="font-mono text-xs">Authorization</code> header using the Bearer scheme, or via <code className="font-mono text-xs">X-GressPay-Key</code>:
            </p>
            <pre className="p-4 rounded-xl bg-zinc-950 text-xs font-mono text-zinc-300 border border-zinc-800 overflow-x-auto">
{`Authorization: Bearer gp_live_sk_948192ab3c4d5e...
Content-Type: application/json`}
            </pre>
          </section>

          {/* Section 4: Create Checkout Session */}
          <section id="create-session" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">04.</span> Create Checkout Session
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Initiate a payment session from your server. The response returns a <code className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">payUrl</code>. Redirect your customer to this URL to complete payment:
            </p>
            <pre className="p-4 rounded-xl bg-zinc-950 text-xs font-mono text-zinc-300 border border-zinc-800 overflow-x-auto leading-relaxed">
{`curl -X POST https://your-domain.com/api/v1/checkout/create \\
  -H "Authorization: Bearer gp_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 2500,
    "currency": "BDT",
    "email": "customer@gmail.com",
    "full_name": "Rahim Ahmed",
    "return_url": "https://mystore.com/orders/1042/success",
    "webhook_url": "https://mystore.com/api/webhooks/gresspay",
    "metadata": { "orderId": "ORD-1042" }
  }'`}
            </pre>
          </section>

          {/* Section 5: Server-to-Server Verification */}
          <section id="verify-status" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">05.</span> Server-to-Server Verification
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <strong>CRITICAL SAFETY RULE:</strong> Never fulfill an order or grant access simply because a customer returns to your <code className="font-mono text-xs">return_url</code>. Always verify transaction status server-to-server or rely on verified signed webhooks:
            </p>
            <pre className="p-4 rounded-xl bg-zinc-950 text-xs font-mono text-zinc-300 border border-zinc-800 overflow-x-auto leading-relaxed">
{`curl -X POST https://your-domain.com/api/v1/checkout/verify-payment \\
  -H "Authorization: Bearer gp_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "sessionId": "chs_98218a" }'`}
            </pre>
          </section>

          {/* Section 6: Webhooks & Signatures */}
          <section id="webhooks" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">06.</span> Webhooks, Signatures & Idempotency
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              GressPay delivers HTTP POST webhooks for payment completion events. Each webhook contains an <code className="font-mono text-xs">X-GressPay-Signature</code> header calculated as:
            </p>
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 font-mono text-xs text-zinc-800 dark:text-zinc-200">
              X-GressPay-Signature = hash_hmac(&apos;sha256&apos;, rawRequestBody, webhookSecret)
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Always compute the HMAC on the <strong>raw, unparsed request bytes</strong> and compare using constant-time comparison (<code className="font-mono">hash_equals</code> in PHP, <code className="font-mono">crypto.timingSafeEqual</code> in Node.js, <code className="font-mono">hmac.compare_digest</code> in Python) to prevent timing side-channel attacks.
            </p>
          </section>

          {/* Section 7: Runnable Server Integration Examples */}
          <section id="code-examples" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="text-[#077C74] dark:text-[#1BD1C0]">07.</span> Runnable Server Integration Examples
              </h2>

              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                {(["node", "php", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                      activeLang === lang
                        ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {lang === "node" ? "Node.js" : lang === "php" ? "PHP" : "Python"}
                  </button>
                ))}
              </div>
            </div>

            <Card className="p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                <span>{activeLang === "node" ? "server.js" : activeLang === "php" ? "gresspay.php" : "server.py"}</span>
                <span className="text-[11px] text-zinc-500">Read keys from env vars</span>
              </div>
              <pre className="p-5 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[480px]">
                {activeLang === "node" ? nodeSnippet : activeLang === "php" ? phpSnippet : pythonSnippet}
              </pre>
            </Card>
          </section>

          {/* Section 8: Error Codes */}
          <section id="error-codes" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">08.</span> Error Codes & Troubleshooting
            </h2>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-semibold text-zinc-600 dark:text-zinc-400">
                    <th className="p-3">Error Code</th>
                    <th className="p-3">HTTP Status</th>
                    <th className="p-3">Meaning & Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  <tr>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">UNAUTHORIZED</td>
                    <td className="p-3 font-mono">401</td>
                    <td className="p-3">Missing or invalid API key. Verify Bearer token format.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">FORBIDDEN_SCOPE</td>
                    <td className="p-3 font-mono">403</td>
                    <td className="p-3">API key lacks the required permission scope (e.g. create_payment).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">DUPLICATE_TXID</td>
                    <td className="p-3 font-mono">409</td>
                    <td className="p-3">Transaction identifier was already settled. Prevents double-spending.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">RATE_LIMITED</td>
                    <td className="p-3 font-mono">429</td>
                    <td className="p-3">Exceeded 60 requests/minute. Implement exponential backoff.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">METHOD_UNAVAILABLE</td>
                    <td className="p-3 font-mono">422</td>
                    <td className="p-3">Merchant has not saved receiving wallet details or operator gate is closed.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 9: Rails & Verification Models */}
          <section id="rails-models" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">09.</span> Rails & Verification Models
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-2">
                <Badge variant="cyan" size="sm">bKash & Nagad</Badge>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">SMS Companion Matching</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Funds settle directly to your merchant wallet. GressPay Companion APK on your phone parses carrier receipt SMS and matches amount + TrxID within 2-3s.
                </p>
              </Card>
              <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-2">
                <Badge variant="emerald" size="sm">Binance Pay</Badge>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Merchant Open API</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Official server-to-server merchant order creation and checkout redirect. Off-chain crypto settlement with zero chargebacks.
                </p>
              </Card>
              <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-2">
                <Badge variant="emerald" size="sm">USDT TRC-20</Badge>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">TRON On-Chain Verification</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Direct blockchain smart-contract verification on TRON network. Requires 20 block confirmations before settling to merchant ledger.
                </p>
              </Card>
              <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-2">
                <Badge variant="slate" size="sm">Free Beta Policy</Badge>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">0% Platform Commission</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Initial beta release has zero GressPay platform fees. You pay only standard carrier MFS cash-out or native TRON blockchain gas fees.
                </p>
              </Card>
            </div>
          </section>

          {/* Section 10: Go-Live Checklist */}
          <section id="go-live" className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-[#077C74] dark:text-[#1BD1C0]">10.</span> Production Go-Live Checklist
            </h2>
            <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Switch all API requests from <code className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">gp_test_...</code> to <code className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">gp_live_...</code>.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Verify that your receiving bKash/Nagad wallet numbers and USDT TRON address are configured in Dashboard → Payment Rails.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Configure your live HTTPS webhook URL and verify HMAC SHA-256 signatures with constant-time comparison on incoming events.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Ensure your server checks <code className="font-mono">/api/v1/checkout/verify-payment</code> before releasing high-value goods.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
