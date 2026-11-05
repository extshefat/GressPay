"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { developers, site } from "@/content/marketing";
import { Button } from "@/components/ui/button";

const HOST = `${site.url.replace(/\/$/, "")}/api/v1`;

const SNIPPETS: Record<string, string> = {
  curl: `curl -X POST ${HOST}/checkout/sessions \\
  -H "Authorization: Bearer gp_live_YOUR_KEY" \\
  -H "X-GressPay-Brand: your_brand_id" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":"1250.00","currency":"BDT","orderId":"ORD-1042"}'`,
  php: `$ch = curl_init('${HOST}/checkout/sessions');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer gp_live_YOUR_KEY',
    'X-GressPay-Brand: your_brand_id',
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'amount' => '1250.00',
    'currency' => 'BDT',
    'orderId' => 'ORD-1042',
  ]),
  CURLOPT_RETURNTRANSFER => true,
]);
echo curl_exec($ch);`,
  node: `const res = await fetch("${HOST}/checkout/sessions", {
  method: "POST",
  headers: {
    Authorization: "Bearer gp_live_YOUR_KEY",
    "X-GressPay-Brand": "your_brand_id",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ amount: "1250.00", currency: "BDT", orderId: "ORD-1042" }),
});
console.log(await res.json());`,
  wordpress: `// WooCommerce: install sdk/wordpress/gresspay-woocommerce
// Settings → Payments → GressPay → paste live key + brand id
// Checkout creates a hosted session via POST /api/v1/checkout/sessions`,
};

function highlight(code: string) {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/(https?:\/\/[^\s"']+)/g, '<span class="text-accent">$1</span>')
    .replace(/("(?:\\.|[^"\\])*")/g, '<span class="text-success">$1</span>')
    .replace(/\b(curl|fetch|json_encode|Authorization|X-GressPay-Brand)\b/g, '<span class="text-warning">$1</span>');
}

export function DeveloperPreview() {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("curl");
  const [copied, setCopied] = useState(false);
  const code = SNIPPETS[tab];
  const html = useMemo(() => highlight(code), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <MarketingBand id="developers">
      <MarketingHeader
        kicker={developers.eyebrow}
        title={developers.title}
        description={developers.body}
        actions={
          <Link href={developers.cta.href}>
            <Button type="button" variant="secondary" size="sm">
              {developers.cta.label}
            </Button>
          </Link>
        }
      />
      <div className="gp-surface overflow-hidden" data-elevation="raised">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
          {(Object.keys(SNIPPETS) as Array<keyof typeof SNIPPETS>).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${tab === key ? "bg-card shadow-raised" : "text-muted"}`}
            >
              {key}
            </button>
          ))}
          <button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
          <code className="font-mono" dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </MarketingBand>
  );
}
