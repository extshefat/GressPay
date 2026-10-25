import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { Smartphone, Zap, Link2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" dot>
          Supported Rails
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bangladesh MFS &amp; USDT TRC-20
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Focused exclusively on Bangladesh (bKash &amp; Nagad direct-to-wallet automation) with separated TRON on-chain USDT verification. No speculative stubs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">bKash &amp; Nagad MFS</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Personal, Agent, or Merchant account numbers. Customers pay your wallet directly. Background companion device matching confirms payments via official provider SMS.
          </p>
        </Card>

        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Android Companion Node</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Lightweight Android background service running on your device. Securely extracts amount and TrxID from official provider alerts with end-to-end token encryption.
          </p>
        </Card>

        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Link2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">USDT TRC-20 (TRON)</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Buyer submits a 64-char transaction hash. The backend verifies canonical USDT contract, Base58 recipient, micro-amount, and block confirmations via TronGrid.
          </p>
        </Card>
      </div>

      <CountryCoverage />

      <div className="text-center">
        <Link href="/login">
          <Button size="lg" variant="primary">
            Sign In with Google to Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
}
