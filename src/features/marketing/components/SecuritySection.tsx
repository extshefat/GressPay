"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, RefreshCw, KeyRound, Server, EyeOff } from "lucide-react";

export const SecuritySection: React.FC = () => {
  const features = [
    {
      icon: <Lock className="w-5 h-5 text-accent dark:text-accent" />,
      title: "HMAC SHA-256 Webhook Signatures",
      desc: "Every webhook notification includes an `X-GressPay-Signature` header calculated using your private secret. Replay attacks and payload tampering are cryptographically prevented.",
    },
    {
      icon: <Server className="w-5 h-5 text-accent dark:text-accent" />,
      title: "Multi-tenant brand isolation",
      desc: "Every gateway, device, API key, and transaction is scoped to your brand_id. Provider credentials are encrypted at rest and never shared across accounts.",
    },
    {
      icon: <EyeOff className="w-5 h-5 text-accent dark:text-accent" />,
      title: "Zero Secret Exposure",
      desc: "Client-facing checkout pages never see your website API secrets. Verification occurs strictly server-to-server or via verified background companion feeds.",
    },
    {
      icon: <KeyRound className="w-5 h-5 text-accent dark:text-accent" />,
      title: "One-Time Secret Reveals & Instant Rotation",
      desc: "API credentials and webhook secrets are displayed only once upon generation. Immediate revocation and rotation are available directly from your dashboard.",
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-accent dark:text-accent" />,
      title: "Duplicate TxID & Replay Defense",
      desc: "Every submitted transaction identifier is locked and checked against historical ledger entries to permanently block double-spending across multiple checkout sessions.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-success dark:text-success" />,
      title: "Companion Device Revocation",
      desc: "If an Android phone running the SMS listener is misplaced, terminate its device token instantly with one click. The companion service will be rejected immediately.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-canvas border-t border-border dark:border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="emerald" dot>
            Payment integrity
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight">
            Evidence first. Confirmation second.
          </h2>
          <p className="text-muted dark:text-muted text-sm sm:text-base leading-relaxed">
            A checkout button never marks an order paid. GressPay waits for verified provider, device or blockchain evidence and keeps every brand ledger isolated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="w-fit rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-2.5">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-ink dark:text-ink">
                {item.title}
              </h3>
              <p className="text-xs text-muted dark:text-muted leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
