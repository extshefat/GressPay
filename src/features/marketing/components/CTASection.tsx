"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, ShieldCheck } from "lucide-react";

export const CTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-zinc-50/50 to-teal-50/30 dark:from-zinc-950 dark:to-teal-950/20 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/70 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Non-Custodial Architecture • Direct Wallet Settle</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
          Automate Your Bangladesh Payments with GressPay
        </h2>

        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Sign in with Google, publish the wallets you control, and pair a companion if you want live bKash or Nagad matching.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link href="/login">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Get Started with Google
            </Button>
          </Link>
          <Link href="/developers">
            <Button size="lg" variant="outline" leftIcon={<Code2 className="w-4 h-4" />}>
              Explore API Reference
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
