"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Coins, Wallet, Zap, Plug } from "lucide-react";
import Link from "next/link";

interface SupportedRail {
  id: string;
  name: string;
  category: "mfs" | "crypto";
  type: string;
  currency: string;
  settlement: string;
  verificationMechanism: string;
  features: string[];
  statusLabel: string;
}

const SUPPORTED_RAILS: SupportedRail[] = [
  {
    id: "bkash",
    name: "bKash",
    category: "mfs",
    type: "Personal / Agent wallet",
    currency: "BDT",
    settlement: "Direct to your bKash number",
    verificationMechanism: "Android companion SMS match in ~1 second",
    features: ["Send Money or Cash In instructions", "TrxID + amount matching", "Multi-gateway numbers"],
    statusLabel: "MFS",
  },
  {
    id: "nagad",
    name: "Nagad",
    category: "mfs",
    type: "Personal / Agent wallet",
    currency: "BDT",
    settlement: "Direct to your Nagad number",
    verificationMechanism: "Android companion SMS match in ~1 second",
    features: ["Personal or agent account types", "Duplicate TrxID blocked", "Live companion heartbeat"],
    statusLabel: "MFS",
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "mfs",
    type: "DBBL mobile banking",
    currency: "BDT",
    settlement: "Direct to your Rocket wallet",
    verificationMechanism: "Companion SMS parser + auto verify",
    features: ["11–12 digit wallets", "OTP/promo SMS ignored", "Offline WorkManager queue"],
    statusLabel: "MFS",
  },
  {
    id: "upay",
    name: "Upay",
    category: "mfs",
    type: "UCB Upay wallet",
    currency: "BDT",
    settlement: "Direct to your Upay number",
    verificationMechanism: "Companion SMS match",
    features: ["Same BD MFS checkout UX", "Copy number + amount", "Webhook on settle"],
    statusLabel: "MFS",
  },
  {
    id: "cellfin",
    name: "Cellfin",
    category: "mfs",
    type: "Islami Bank smart banking",
    currency: "BDT",
    settlement: "Direct to your Cellfin account",
    verificationMechanism: "Companion SMS match",
    features: ["Pro+ plan rail", "English checkout steps", "Device-scoped ingest"],
    statusLabel: "MFS",
  },
  {
    id: "usdt_trc20",
    name: "USDT TRC-20",
    category: "crypto",
    type: "TRON network",
    currency: "USDT",
    settlement: "Your TRC-20 address (T…)",
    verificationMechanism: "On-chain TronGrid confirmations",
    features: ["Exact micro-USDT amount", "QR + copy address", "Live or custom BDT rate"],
    statusLabel: "Crypto",
  },
  {
    id: "binance_pay",
    name: "Binance Pay",
    category: "crypto",
    type: "Merchant API or UID",
    currency: "USDT",
    settlement: "Binance Pay order / UID",
    verificationMechanism: "Official Merchant API query (PAID)",
    features: ["Encrypted API credentials", "QR / UID checkout", "Webhook + reconcile"],
    statusLabel: "Crypto",
  },
  {
    id: "bybit_pay",
    name: "Bybit Pay",
    category: "crypto",
    type: "Internal transfer / UID",
    currency: "USDT",
    settlement: "Your Bybit UID",
    verificationMechanism: "Order ID / TxID verify flow",
    features: ["UID + optional TRC20", "QR for UID", "Pro+ crypto suite"],
    statusLabel: "Crypto",
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
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="slate" dot>
            Payment Rails
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bangladesh MFS + Global Crypto
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Every rail settles direct to your wallet. Zero platform escrow. Zero commission held.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <Wallet className="w-5 h-5" />,
              title: "100% Direct-to-Wallet",
              body: "Funds hit your own MFS or crypto wallet instantly—zero settlement delay, zero commission held.",
            },
            {
              icon: <Zap className="w-5 h-5" />,
              title: "1-Second Companion Sync",
              body: "Lightweight Android APK reads incoming MFS SMS and verifies checkouts automatically.",
            },
            {
              icon: <Plug className="w-5 h-5" />,
              title: "Plug & Play Webhooks",
              body: "Integrate WordPress/WooCommerce, Laravel, PHP, or Next.js in minutes with HMAC signatures.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="p-5 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.body}</p>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1 max-w-md mx-auto">
          {(
            [
              { id: "all", label: "All Rails", icon: null },
              { id: "mfs", label: "Bangladesh MFS", icon: <Smartphone className="w-3.5 h-3.5" /> },
              { id: "crypto", label: "Global Crypto", icon: <Coins className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                filter === tab.id
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRails.map((rail) => (
            <Card
              key={rail.id}
              className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{rail.name}</span>
                <Badge variant="slate" size="sm">
                  {rail.statusLabel}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">{rail.type} · {rail.currency}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {rail.verificationMechanism}
              </p>
              <ul className="space-y-1">
                {rail.features.map((f) => (
                  <li key={f} className="text-[11px] text-zinc-500 flex gap-1.5">
                    <span className="text-zinc-900 dark:text-zinc-100">·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/register">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Configure Your Rails
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
