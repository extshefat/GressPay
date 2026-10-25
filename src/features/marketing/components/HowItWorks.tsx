"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Smartphone, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      icon: <KeyRound className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      title: "Sign In & Configure",
      desc: "Sign in with Google, or with a password if the account already has one. Add the bKash or Nagad number you control, and optionally a TRON address or Binance Pay Merchant API credentials.",
    },
    {
      num: "02",
      icon: <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      title: "Pair Android Companion",
      desc: "Install the companion on an Android phone you control and pair it with a device token. Live bKash and Nagad checks use the provider SMS that phone receives. Without a paired device, those checkouts stay pending.",
    },
    {
      num: "03",
      icon: <ExternalLink className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      title: "Deploy Checkout Links",
      desc: "Generate hosted payment links from your dashboard or initiate sessions programmatically via our clean REST API (`POST /api/v1/checkout/create`).",
    },
    {
      num: "04",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: "Evidence, then status",
      desc: "The customer pays your wallet. GressPay marks the session paid only after a matching SMS, a Binance Pay order query, or a confirmed TRON transfer. It then sends one signed webhook. A return URL does not complete the payment.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="emerald" dot>
            Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            How GressPay Powers Your Payment Flow
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Customer payment, then evidence, then a status update. Funds go to the wallet you configured.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
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
                <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-medium">
                  Step {step.num} Complete →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
