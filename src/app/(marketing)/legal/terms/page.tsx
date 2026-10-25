import React from "react";
import { Badge } from "@/components/ui/badge";

export default function TermsPage() {
  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="space-y-3">
        <Badge variant="cyan">Terms</Badge>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Terms of service</h1>
        <p className="text-sm text-slate-400">Last updated 23 October 2026</p>
      </div>

      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Who this is for</h2>
          <p>
            GressPay is a merchant payment gateway. You create an account, publish your own wallet
            details, and collect payments from customers via hosted links, invoices, or the REST API.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Your wallets, your funds</h2>
          <p>
            Customers pay the bKash, Nagad, Binance Pay, or USDT TRC-20 destination you configure. GressPay
            records sessions, matches TxIDs, and sends webhooks. It does not hold a merchant float or
            issue card acquiring.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">You are responsible for</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Accuracy of deposit numbers and USDT addresses</li>
            <li>Reconciling payments that arrive on those wallets</li>
            <li>Keeping API secrets and JWT sessions private</li>
            <li>Using the service only for lawful goods and services</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-white">No SLA in these terms</h2>
          <p>
            Uptime depends on the host this instance runs on. There is no 99.9% availability promise
            in this document. Check the Status page for how this deployment is operated.
          </p>
        </section>
      </div>
    </div>
  );
}
