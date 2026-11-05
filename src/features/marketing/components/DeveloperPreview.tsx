"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";

const SNIPPETS: Record<string, string> = {
  Create: `curl -X POST https://your-domain.com/api/v1/checkout/create \\
  -H "Authorization: Bearer gp_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1500,
    "currency": "BDT",
    "full_name": "Ayesha",
    "email": "a@shop.bd",
    "return_url": "https://yoursite.com/order/thanks",
    "webhook_url": "https://yoursite.com/webhooks/gresspay",
    "metadata": { "orderId": "ORD-8842" }
  }'

# Response includes sessionId + payUrl → redirect the buyer to payUrl`,
  Pay: `# Buyer opens hosted checkout (no API key):
# GET https://your-domain.com/pay/chs_xxx
#
# Page calls:
curl -X POST https://your-domain.com/api/v1/checkout/chs_xxx/init \\
  -H "Content-Type: application/json"

# Buyer submits TxID on the hosted form:
curl -X POST https://your-domain.com/api/v1/checkout/chs_xxx/verify \\
  -H "Content-Type: application/json" \\
  -d '{ "trx_id": "BKH1234567", "method": "bkash" }'`,
  Status: `curl -X POST https://your-domain.com/api/v1/checkout/verify-payment \\
  -H "Authorization: Bearer gp_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "sessionId": "chs_xxx" }'

# Also: GET /api/v1/checkout/chs_xxx/status (public poll)
# Webhook: X-GressPay-Signature = HMAC-SHA256(rawBody, webhookSecret)`,
};

const TABS = ["Create", "Pay", "Status"] as const;

export const DeveloperPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Create");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SNIPPETS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 bg-card/60 dark:bg-surface/40 border-t border-border dark:border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <Badge variant="emerald" dot>
              REST API
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight leading-tight">
              Create a session. Host the pay page. Confirm with verify-payment.
            </h2>
            <p className="text-muted dark:text-muted text-sm sm:text-base leading-relaxed">
              Authenticate with your brand website key{" "}
              <span className="font-mono text-ink dark:text-ink">gp_live_…</span> from Dashboard → Brands.
              Create returns{" "}
              <span className="font-mono text-ink dark:text-ink">payUrl</span> — redirect the customer to
              GressPay hosted checkout, then confirm via webhook HMAC or{" "}
              <span className="font-mono text-ink dark:text-ink">verify-payment</span>.
            </p>
            <div className="space-y-2 text-xs font-mono text-ink dark:text-ink">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink dark:text-ink">POST /api/v1/checkout/create</span>
                <span className="text-muted">→ sessionId + payUrl</span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink dark:text-ink">/pay/&#123;sessionId&#125;</span>
                <span className="text-muted">— Hosted checkout</span>
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink dark:text-ink">POST …/verify-payment</span>
                <span className="text-muted">— Payment status</span>
              </p>
            </div>
            <div className="pt-2">
              <Link href="/developers">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Full API reference
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border dark:border-border bg-ink-solid text-on-ink p-0 shadow-lg">
              <div className="flex items-center justify-between px-4 py-2.5 bg-ink-solid/90 border-b border-border">
                <div className="flex items-center gap-3">
                  <Terminal className="w-4 h-4 text-muted" />
                  <div className="flex gap-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                          activeTab === tab
                            ? "bg-ink-solid text-white font-medium"
                            : "text-muted hover:text-white"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-white font-mono px-2 py-1 rounded hover:bg-ink-solid transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 sm:p-5 text-xs font-mono text-muted overflow-x-auto leading-relaxed selection:bg-ink-solid">
                <code>{SNIPPETS[activeTab]}</code>
              </pre>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
