import React from "react";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 transition-colors">
      <div className="space-y-3">
        <Badge variant="cyan">Privacy</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Privacy policy
        </h1>
        <p className="text-xs text-zinc-500 font-mono">Last updated October 2026</p>
      </div>

      <div className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Who this covers</h2>
          <p>
            This policy describes data handled by a GressPay deployment: users who create
            accounts, and buyers who pay through hosted checkout links or invoices.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">What we store</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>User account: name, email, password hash, business name</li>
            <li>API key prefixes and hashed secrets; webhook URL and signing secret</li>
            <li>Payment destinations you publish (bKash or Nagad numbers, Binance Pay is stored server-side, USDT TRC-20 address)</li>
            <li>Checkout sessions: amount, currency, method, customer contact if provided, TxID</li>
            <li>Optional companion device tokens for SMS match</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">What we do not store</h2>
          <p>
            Card numbers, CVVs, 3-D Secure payloads, or full bank login credentials. Funds settle to
            the wallets you configure; GressPay is the ledger and confirmation layer.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Sessions and cookies</h2>
          <p>
            Dashboard sign-in uses a JWT kept in browser storage. Theme preference may be saved
            locally as <code className="font-mono text-zinc-900 dark:text-zinc-100">gresspay_theme</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Webhooks</h2>
          <p>
            When a payment completes, GressPay may POST signed event JSON to the webhook URL you set.
            You control that endpoint and how long you retain payloads.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Operator responsibility</h2>
          <p>
            This software runs on the host you deploy. Retention, backups, and access control for the
            database are the operator&apos;s responsibility.
          </p>
        </section>
      </div>
    </div>
  );
}
