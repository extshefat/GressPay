"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Smartphone, Cpu, Lock } from "lucide-react";

const CAPABILITY_ITEMS = [
  { label: "bKash Automation", detail: "Personal & Merchant SMS Match", icon: Smartphone },
  { label: "Nagad Automation", detail: "Instant TrxID Verification", icon: Smartphone },
  { label: "USDT TRC-20", detail: "On-Chain TRON RPC Verification", icon: Cpu },
  { label: "Non-Custodial", detail: "Direct Wallet Settlement", icon: ShieldCheck },
  { label: "Idempotent Webhooks", detail: "HMAC SHA-256 Signatures", icon: Lock },
];

export const LiveTicker: React.FC = () => {
  return (
    <div className="w-full bg-zinc-50/80 dark:bg-zinc-900/60 border-y border-zinc-200 dark:border-zinc-800 overflow-hidden py-3 select-none backdrop-blur-md">
      <div className="flex items-center max-w-7xl mx-auto px-4 sm:px-6">
        <div className="px-3 shrink-0 flex items-center gap-2 border-r border-zinc-300 dark:border-zinc-700 text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 tracking-wider uppercase">
          SUPPORTED RAILS
        </div>
        <div className="flex whitespace-nowrap overflow-hidden ml-4">
          <div className="flex items-center gap-8 animate-ticker">
            {CAPABILITY_ITEMS.concat(CAPABILITY_ITEMS).map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="inline-flex items-center gap-2 text-xs font-mono">
                  <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.label}</span>
                  <span className="text-zinc-400 dark:text-zinc-600">·</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{item.detail}</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
