"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wallet, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      icon: <Wallet className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Connect Your Wallet",
      desc: "Add your personal or agent bKash, Nagad, Rocket, Upay, or Cellfin number (or Crypto wallet). Money goes directly into your wallet — GressPay never holds your funds or charges commission.",
    },
    {
      num: "02",
      icon: <Smartphone className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Pair Android Companion",
      desc: "Install the GressPay Companion APK on any Android phone holding your merchant SIM cards. Pair with a secure one-time Device Token in under 30 seconds.",
    },
    {
      num: "03",
      icon: <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      title: "Accept & Auto-Verify",
      desc: "Customers pay via Hosted Checkout Links, WooCommerce, or REST API. When the transfer SMS arrives, GressPay matches the TrxID in 1 second and fires a signed webhook to fulfill orders.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <Badge variant="emerald" dot>
            Automated Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            How GressPay Automates Your Payments
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            3 simple steps to accept automated personal MFS and crypto payments without merchant trade licenses or aggregator fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {step.icon}
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-400 dark:text-zinc-600">
                    STEP {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider">
                  Automated Phase {step.num} →
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/register">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Start Automating Today
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
