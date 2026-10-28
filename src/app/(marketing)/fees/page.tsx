"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, ArrowRight, HelpCircle, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import { PricingSection } from "@/features/marketing/components/PricingSection";

export default function FeesPage() {
  const faqs = [
    {
      q: "Do you take any percentage commission from my transactions?",
      a: "No! Unlike traditional aggregators that charge 1.5% to 2.5% per payment, GressPay charges 0% transaction commission. Your customers transfer money directly into your personal or agent bKash, Nagad, Rocket, or Upay wallet.",
    },
    {
      q: "How does GressPay verify that a customer actually paid?",
      a: "You install the GressPay Companion Android APK on the phone holding your merchant SIM cards. When customer money arrives, the app securely captures the provider SMS and auto-matches the TrxID and amount to the pending checkout session within 1-2 seconds.",
    },
    {
      q: "Can I use multiple SIMs and phones simultaneously?",
      a: "Yes! On the Pro Plan you can pair up to 5 Android devices, and on the Enterprise or Lifetime plans you can pair unlimited devices to handle high-concurrency payment volume.",
    },
    {
      q: "What happens if my phone temporarily loses internet connection?",
      a: "The GressPay Companion APK utilizes Android WorkManager with offline persistence. As soon as the phone reconnects to WiFi or mobile data, all buffered SMS notifications are synced and pending orders are instantly settled.",
    },
  ];

  return (
    <div className="pt-24 pb-20 space-y-16">
      {/* SaaS Pricing Section */}
      <PricingSection showTitle={true} />

      {/* Core Non-Custodial Principles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="emerald" dot>
            Enterprise Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Why Merchants Choose GressPay Over Traditional Gateways
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Engineered for speed, total financial custody, and zero downtime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Direct-to-Wallet Liquidity
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Never wait 3 to 7 days for gateway settlements. Customer funds land directly in your bKash, Nagad, Rocket, or TRON wallet with immediate cash access.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Personal & Agent Support
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              No expensive merchant trade licenses or merchant accounts required. Automate payments using your standard personal SIM cards with USSD and App support.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Instant Webhook Deliveries
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Signed HMAC-SHA256 webhooks notify your WooCommerce, custom backend, or website the exact second a matching SMS or crypto confirmation is registered.
            </p>
          </Card>
        </div>

        {/* Pricing FAQ */}
        <div className="pt-8">
          <Card className="p-8 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Frequently Asked Questions About Subscriptions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((f, i) => (
                <div key={i} className="space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {f.q}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-6 leading-relaxed">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-zinc-500">
                Ready to automate your online payments without high aggregator commission?
              </span>
              <Link href="/register">
                <Button size="md" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Merchant Account
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
