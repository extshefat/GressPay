import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { Smartphone, Zap, Link2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="cyan" dot>
          First release rails
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Bangladesh MFS, Binance Pay, USDT TRC-20
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">
          India, Pakistan, Nepal, and other BD wallets are not live in this release. Crypto rails stay
          disabled until the operator enables them and credentials/addresses are configured.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-void-card border-void-border/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">bKash &amp; Nagad + SMS</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Merchant-owned personal numbers. The Android companion forwards parsed amount/TxID only —
            not full SMS bodies. Live payments stay pending until SMS match (or merchant confirm).
          </p>
        </Card>

        <Card className="p-6 bg-void-card border-void-border/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-brand-emerald/30 flex items-center justify-center text-brand-emerald">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Binance Pay</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Official Binance Pay Merchant API (not Spot trading). Server creates the order, verifies
            signed callbacks, then queries order status before marking paid.
          </p>
        </Card>

        <Card className="p-6 bg-void-card border-void-border/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-brand-sky/30 flex items-center justify-center text-brand-sky">
            <Link2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">USDT TRC-20</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Buyer submits a transaction hash; the backend verifies recipient, contract, amount, and
            confirmations via Tron. A pasted hash alone never completes a live payment.
          </p>
        </Card>
      </div>

      <CountryCoverage />

      <div className="text-center">
        <Link href="/register">
          <Button size="lg">Open a merchant account</Button>
        </Link>
      </div>
    </div>
  );
}
