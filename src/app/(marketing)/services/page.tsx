import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { Smartphone, Zap, Link2, ShieldCheck, ArrowRight, Coins } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" dot>
          Supported Payment Rails
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bangladesh MFS &amp; Global Crypto Rails
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Automate payments for personal and agent SIM cards with 0% gateway commission, plus on-chain USDT and Binance Pay settlement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900/40">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            All Bangladesh MFS Rails
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Support for <strong>bKash</strong>, <strong>Nagad</strong>, <strong>Rocket</strong>, <strong>Upay</strong>, and <strong>Cellfin</strong>. Connect your personal or agent numbers — money transfers directly into your pocket.
          </p>
        </Card>

        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900/40">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            GressPay Companion APK
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Lightweight Android background service running on your phone. Securely extracts amount and TrxID from official provider alerts with 1-second auto-reconciliation.
          </p>
        </Card>

        <Card className="p-6 border-zinc-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900/40">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Crypto &amp; Binance Pay
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Accept global payments via TRON USDT TRC-20 with real-time on-chain verification, and Binance Pay with instant order confirmation.
          </p>
        </Card>
      </div>

      <CountryCoverage />

      <div className="text-center pt-4">
        <Link href="/register">
          <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Get Started Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
