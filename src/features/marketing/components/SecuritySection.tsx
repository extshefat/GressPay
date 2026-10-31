"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, RefreshCw, KeyRound, Server, EyeOff } from "lucide-react";

export const SecuritySection: React.FC = () => {
  const features = [
    {
      icon: <Lock className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0]" />,
      title: "HMAC SHA-256 Webhook Signatures",
      desc: "Every webhook notification includes an `X-GressPay-Signature` header calculated using your private secret. Replay attacks and payload tampering are cryptographically prevented.",
    },
    {
      icon: <Server className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0]" />,
      title: "Multi-tenant brand isolation",
      desc: "Every gateway, device, API key, and transaction is scoped to your brand_id. Provider credentials are encrypted at rest and never shared across accounts.",
    },
    {
      icon: <EyeOff className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0]" />,
      title: "Zero Secret Exposure",
      desc: "Client-facing checkout pages never see your website API secrets. Verification occurs strictly server-to-server or via verified background companion feeds.",
    },
    {
      icon: <KeyRound className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0]" />,
      title: "One-Time Secret Reveals & Instant Rotation",
      desc: "API credentials and webhook secrets are displayed only once upon generation. Immediate revocation and rotation are available directly from your dashboard.",
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0]" />,
      title: "Duplicate TxID & Replay Defense",
      desc: "Every submitted transaction identifier is locked and checked against historical ledger entries to permanently block double-spending across multiple checkout sessions.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: "Companion Device Revocation",
      desc: "If an Android phone running the SMS listener is misplaced, terminate its device token instantly with one click. The companion service will be rejected immediately.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="emerald" dot>
            Enterprise Security
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Financial-Grade Architecture Built for Trust
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Payment integrity is non-negotiable. GressPay applies rigorous cryptographic verification, isolated ledgers, and zero-trust device management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 w-fit border border-zinc-200/80 dark:border-zinc-700 shadow-2xs">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
