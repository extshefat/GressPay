"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const DEFAULT_HOST = "https://gresspay.extxcheats.com/api/v1";

export function MerchantEnvSnippet({ host = DEFAULT_HOST }: { host?: string }) {
  const envBlock = `GRESSPAY_WEBSITE_API_KEY=gp_live_your_secret_here
GRESSPAY_CHECKOUT_URL=${host}/payment/create
GRESSPAY_VERIFY_URL=${host}/payment/verify`;

  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card dark:border-border dark:bg-canvas">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 dark:border-border">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Website API key — server-side .env only
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(envBlock);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface dark:border-border dark:bg-surface dark:text-ink"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-ink dark:text-ink">
        <code>{envBlock}</code>
      </pre>
    </div>
  );
}
