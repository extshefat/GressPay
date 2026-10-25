"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Cpu, Coins, Lock } from "lucide-react";
import Link from "next/link";

interface SupportedRail {
  id: string;
  name: string;
  category: "mfs" | "crypto";
  type: string;
  currency: string;
  settlement: string;
  verificationMechanism: string;
  feeInfo: string;
  features: string[];
  statusLabel: string;
}

const SUPPORTED_RAILS: SupportedRail[] = [
  {
    id: "bkash",
    name: "bKash Automation",
    category: "mfs",
    type: "Personal, Agent & Merchant Numbers",
    currency: "BDT",
    settlement: "Direct to your own bKash account",
    verificationMechanism: "Approved companion SMS with the same brand, rail, TrxID, and amount. A pasted TrxID alone does not complete a live checkout.",
    feeInfo: "You receive the transfer in your own bKash account",
    features: [
      "Personal, Agent, or Merchant is a label you set, not an official bKash API",
      "Live completion needs a paired Android companion and the provider SMS",
      "Test ledger can simulate a match and is stored separately",
    ],
    statusLabel: "SMS match",
  },
  {
    id: "nagad",
    name: "Nagad Automation",
    category: "mfs",
    type: "Personal, Agent & Merchant Numbers",
    currency: "BDT",
    settlement: "Direct to your own Nagad account",
    verificationMechanism: "Approved companion SMS with the same brand, rail, TrxID, and amount. Screenshots are not accepted as proof.",
    feeInfo: "You receive the transfer in your own Nagad account",
    features: [
      "Account type does not create a Nagad merchant integration",
      "Live completion needs a paired Android companion and the provider SMS",
      "Duplicate TrxIDs are rejected inside the same brand",
    ],
    statusLabel: "SMS match",
  },
  {
    id: "binance_pay",
    name: "Binance Pay",
    category: "crypto",
    type: "Merchant API, not Spot trading",
    currency: "USDT",
    settlement: "Binance Pay checkout for the order GressPay creates",
    verificationMechanism: "Server creates an order, then marks paid only after a provider query returns PAID with a matching amount and trade number.",
    feeInfo: "Optional. Credentials stay encrypted on the server.",
    features: [
      "Needs Binance Pay Merchant API key, secret, and certificate serial",
      "A payment to a Binance-owned address is not a Binance Pay order",
      "Webhook callbacks are a signal. The server re-queries before completing.",
    ],
    statusLabel: "Optional",
  },
  {
    id: "usdt_trc20",
    name: "USDT TRC-20 (TRON)",
    category: "crypto",
    type: "Non-Custodial On-Chain Settlement",
    currency: "USDT",
    settlement: "Direct to your TRON wallet address (T...)",
    verificationMechanism: "On-chain TronGrid RPC verification (Contract, micro-units & block confirmations)",
    feeInfo: "Blockchain network fee only",
    features: [
      "Separate from Binance Pay. A hash alone does not complete a live checkout.",
      "Checks contract, recipient address, exact token amount, and confirmation count",
      "Confirm the TRON network and address before you publish them",
    ],
    statusLabel: "On-chain",
  },
];

export const CountryCoverage: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "mfs" | "crypto">("all");

  const filteredRails = SUPPORTED_RAILS.filter((rail) => {
    if (filter === "mfs") return rail.category === "mfs";
    if (filter === "crypto") return rail.category === "crypto";
    return true;
  });

  return (
    <section className="py-20 bg-white dark:bg-zinc-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="emerald" className="font-mono text-[10px] uppercase">
            What this release checks
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bangladesh wallets, then two optional crypto checks.
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            bKash and Nagad are SMS matches against your own numbers. Binance Pay and USDT TRC-20 are optional and use different evidence. India, Pakistan, and Nepal rails are not part of this release.
          </p>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[
              { id: "all", label: "All Supported Rails" },
              { id: "mfs", label: "Bangladesh MFS (bKash & Nagad)" },
              { id: "crypto", label: "Binance Pay and USDT" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  filter === tab.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rails Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRails.map((rail) => (
            <Card
              key={rail.id}
              className="p-6 flex flex-col justify-between space-y-6 hover:shadow-lg transition-all border-zinc-200 dark:border-zinc-800"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      {rail.category === "mfs" ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Coins className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {rail.name}
                      </h3>
                      <div className="text-[11px] font-mono text-zinc-500 uppercase">
                        {rail.currency} · {rail.type}
                      </div>
                    </div>
                  </div>
                  <Badge variant="slate">{rail.statusLabel}</Badge>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-850 text-xs">
                  <div>
                    <span className="text-zinc-400 font-mono text-[10px] uppercase block">
                      Settlement Destination
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {rail.settlement}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-400 font-mono text-[10px] uppercase block">
                      Verification Architecture
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {rail.verificationMechanism}
                    </span>
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div className="pt-2 space-y-1.5 border-t border-zinc-100 dark:border-zinc-850">
                  {rail.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-mono text-[11px]">{rail.feeInfo}</span>
                <Link
                  href="/developers"
                  className="font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 inline-flex items-center gap-1"
                >
                  Docs <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Non-Custodial Integrity Disclosure */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              Direct-to-Wallet Principle
            </div>
            <p>
              GressPay operates solely as a payment automation and verification engine. All bKash, Nagad, and USDT payments are transferred directly from the customer to your own designated wallet or phone number. GressPay never touches, pools, or delays your merchant settlements.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
