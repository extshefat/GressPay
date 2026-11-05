"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code2, ShieldCheck } from "lucide-react";

export const CTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-card/50 to-surface/30 dark:from-canvas dark:to-brand/20 border-t border-border dark:border-border transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 dark:bg-brand/50 border border-accent dark:border-accent text-accent dark:text-accent text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-accent dark:text-accent" />
          <span>Non-Custodial Architecture • Direct Wallet Settle</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink dark:text-ink tracking-tight leading-tight">
          Automate Your Bangladesh Payments with GressPay
        </h2>

        <p className="text-muted dark:text-muted text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Sign in with Google, publish the wallets you control, and pair a companion if you want live bKash or Nagad matching.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link href="/register">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Sign up
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
