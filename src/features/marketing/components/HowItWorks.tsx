"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Smartphone, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      icon: <KeyRound className="w-5 h-5 text-ink dark:text-ink" />,
      title: "Add your receiving wallets",
      desc: "Publish the bKash, Nagad, Rocket, Upay, or Cellfin numbers — and optional USDT or Binance destinations — that customers pay. GressPay never holds balances.",
    },
    {
      num: "02",
      icon: <Smartphone className="w-5 h-5 text-ink dark:text-ink" />,
      title: "Install the Companion",
      desc: "Download the APK, pair with a gpdev_ device key, and allow SMS on the payment SIM. MFS checkouts verify when the provider SMS arrives.",
    },
    {
      num: "03",
      icon: <ExternalLink className="w-5 h-5 text-ink dark:text-ink" />,
      title: "Share checkout or connect API",
      desc: "Send hosted pay links or integrate from WordPress, Laravel, PHP, or Next.js using your brand API keys.",
    },
    {
      num: "04",
      icon: <ShieldCheck className="w-5 h-5 text-ink dark:text-ink" />,
      title: "Evidence, then webhook",
      desc: "SMS match, on-chain USDT, or Binance Pay confirmation marks the session paid. Your store receives one HMAC-signed webhook.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-card/50 dark:bg-surface/30 border-t border-border dark:border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="slate" dot>
            Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight">
            From checkout link to confirmed order
          </h2>
          <p className="text-muted dark:text-muted text-sm sm:text-base leading-relaxed">
            You keep the wallets. We confirm payment with evidence your server can trust.
          </p>
          <p className="text-xs text-muted">
            <Link href="/download" className="text-accent dark:text-accent hover:underline font-medium">
              Download the Companion APK
            </Link>{" "}
            when you are ready for SMS auto-match.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl border border-border dark:border-border bg-white dark:bg-canvas shadow-xs flex flex-col justify-between hover:border-border dark:hover:border-border transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-surface dark:bg-surface border border-border dark:border-border">
                    {step.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-muted dark:text-muted">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-ink dark:text-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-muted dark:text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
