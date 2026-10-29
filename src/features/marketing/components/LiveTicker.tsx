"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Smartphone, Cpu, Plug } from "lucide-react";

const CAPABILITY_ITEMS = [
  { label: "bKash", detail: "SMS auto-match", icon: Smartphone },
  { label: "Nagad", detail: "SMS auto-match", icon: Smartphone },
  { label: "Rocket", detail: "SMS auto-match", icon: Smartphone },
  { label: "Upay", detail: "SMS auto-match", icon: Smartphone },
  { label: "Cellfin", detail: "SMS auto-match", icon: Smartphone },
  { label: "USDT TRC-20", detail: "On-chain TRON verify", icon: Cpu },
  { label: "Binance Pay", detail: "Merchant API", icon: Cpu },
  { label: "Bybit Pay", detail: "UID transfer", icon: Cpu },
  { label: "Direct wallet", detail: "0% commission held", icon: ShieldCheck },
  { label: "Webhooks", detail: "HMAC signed IPN", icon: Plug },
];

export const LiveTicker: React.FC = () => {
  return (
    <div className="w-full bg-zinc-50/80 dark:bg-zinc-900/60 border-y border-zinc-200 dark:border-zinc-800 overflow-hidden py-3 select-none backdrop-blur-md">
      <div className="flex items-center max-w-7xl mx-auto px-4 sm:px-6">
        <div className="px-3 shrink-0 flex items-center gap-2 border-r border-zinc-300 dark:border-zinc-700 text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 tracking-wider uppercase">
          SUPPORTED RAILS
        </div>
        <div className="flex whitespace-nowrap overflow-hidden ml-4">
          <div className="flex items-center gap-8 animate-ticker">
            {CAPABILITY_ITEMS.concat(CAPABILITY_ITEMS).map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="inline-flex items-center gap-2 text-xs font-mono">
                  <Icon className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.label}</span>
                  <span className="text-zinc-400 dark:text-zinc-600">·</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{item.detail}</span>
                  <CheckCircle2 className="w-3 h-3 text-zinc-500 inline ml-1" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
