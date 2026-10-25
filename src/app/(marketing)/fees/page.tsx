import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const FEE_SCHEDULE = [
  {
    rail: "bKash",
    category: "Bangladesh MFS",
    fee: "1.2%",
    payout: "Your personal bKash number",
    note: "SMS companion match (not official merchant API)",
  },
  {
    rail: "Nagad",
    category: "Bangladesh MFS",
    fee: "1.0%",
    payout: "Your personal Nagad number",
    note: "SMS companion match",
  },
  {
    rail: "Binance Pay",
    category: "Exchange (merchant API)",
    fee: "0.5%",
    payout: "Binance Pay merchant settlement",
    note: "Merchant API create/query/callback; reconcile is merchant-auth only",
    recommended: true,
  },
  {
    rail: "USDT TRC-20",
    category: "On-chain",
    fee: "0%",
    payout: "Your TRON USDT address",
    note: "Contract + Base58 recipient + micro-amount + confirmations",
  },
];

export default function FeesPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" dot>
          First-release fees
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Transparent platform fees
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">
          Defaults for rails that ship in this milestone. Other countries remain out of scope — not listed as
          live.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-void-border text-slate-400 text-xs uppercase tracking-wider">
              <th className="py-3 pr-4">Rail</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Fee</th>
              <th className="py-3 pr-4">Settlement</th>
              <th className="py-3">Verification</th>
            </tr>
          </thead>
          <tbody>
            {FEE_SCHEDULE.map((row) => (
              <tr key={row.rail} className="border-b border-void-border/60 text-slate-200">
                <td className="py-4 pr-4 font-medium">
                  {row.rail}
                  {row.recommended ? (
                    <Badge variant="emerald" className="ml-2">
                      Optional
                    </Badge>
                  ) : null}
                </td>
                <td className="py-4 pr-4 text-slate-400">{row.category}</td>
                <td className="py-4 pr-4 font-mono">{row.fee}</td>
                <td className="py-4 pr-4 text-slate-400">{row.payout}</td>
                <td className="py-4 text-slate-400">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="p-6 bg-void-card border-void-border/80 text-center space-y-3 max-w-xl mx-auto">
        <p className="text-xs text-slate-400">
          Network fees (USDT gas) and Binance merchant fees are separate from GressPay platform fees.
        </p>
        <Link href="/register">
          <Button>Get started</Button>
        </Link>
      </Card>
    </div>
  );
}
