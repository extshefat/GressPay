"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Smartphone, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      icon: <KeyRound className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Add your receiving wallets",
      desc: "Publish the bKash, Nagad, Rocket, Upay, or Cellfin numbers — and optional USDT or Binance destinations — that customers pay. GressPay never holds balances.",
    },
    {
      num: "02",
      icon: <Smartphone className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Install the Companion",
      desc: "Download the APK, pair with a gpdev_ device key, and allow SMS on the payment SIM. MFS checkouts verify when the provider SMS arrives.",
    },
    {
      num: "03",
      icon: <ExternalLink className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Share checkout or connect API",
      desc: "Send hosted pay links or integrate from WordPress, Laravel, PHP, or Next.js using your brand API keys.",
    },
    {
      num: "04",
      icon: <ShieldCheck className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Evidence, then webhook",
      desc: "SMS match, on-chain USDT, or Binance Pay confirmation marks the session paid. Your store receives one HMAC-signed webhook.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="slate" dot>
            Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            How to go live in minutes
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            You keep the wallets. We confirm payment with evidence your server can trust.
          </p>
          <p className="text-xs text-zinc-500">
            <Link href="/download" className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
              Download the Companion APK
            </Link>{" "}
            when you are ready for SMS auto-match.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {step.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-600">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                  Step {step.num} →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
