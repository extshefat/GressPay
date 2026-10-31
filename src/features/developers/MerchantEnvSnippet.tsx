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
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <span className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">
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
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-800 dark:text-zinc-100">
        <code>{envBlock}</code>
      </pre>
    </div>
  );
}
