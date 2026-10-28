"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Sparkles, ArrowRight, Smartphone, ShieldCheck } from "lucide-react";

export interface PricingSectionProps {
  showTitle?: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ showTitle = true }) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

  const isYearly = billingCycle === "yearly";

  const plans = [
    {
      id: "starter",
      name: "Starter",
      badge: "Free Tier",
      description: "Ideal for new online stores and testing automated MFS verification.",
      price: {
        BDT: { monthly: 0, yearly: 0 },
        USD: { monthly: 0, yearly: 0 },
      },
      period: "forever",
      highlight: false,
      cta: "Start Free Trial",
      href: "/register?plan=starter",
      features: [
        "0% Transaction Commission (Direct Wallet)",
        "1 Connected Android Companion Device",
        "bKash & Nagad Personal SMS Auto-Match",
        "Hosted Payment Links & Invoices",
        "Standard Webhook & REST API Access",
        "Community & Documentation Support",
      ],
      notIncluded: [
        "Binance Pay & USDT TRC20 Crypto",
        "Custom Checkout Brand Logo",
        "Multi-Merchant Sub-Accounts",
      ],
    },
    {
      id: "pro",
      name: "Pro Business",
      badge: "Most Popular",
      description: "For growing e-commerce stores wanting instant verification & crypto rails.",
      price: {
        BDT: { monthly: 1499, yearly: 1199 },
        USD: { monthly: 15, yearly: 12 },
      },
      period: isYearly ? "per month, billed annually" : "per month",
      highlight: true,
      cta: "Get Started with Pro",
      href: "/register?plan=pro",
      features: [
        "0% Transaction Commission (Direct Wallet)",
        "Up to 5 Connected Android Devices",
        "All MFS: bKash, Nagad, Rocket, Upay, Cellfin",
        "Binance Pay & USDT TRC-20 Crypto Rails",
        "Instant 1-Second SMS Auto-Verification",
        "Custom Brand Logo on Hosted Checkout",
        "Priority Webhook Retries with Backoff",
        "Full API & Webhook Telemetry Logs",
      ],
      notIncluded: [
        "Unlimited Devices",
        "Dedicated VIP Account Manager",
      ],
    },
    {
      id: "business",
      name: "Enterprise",
      badge: "High Volume",
      description: "For high-scale merchants, agencies, and digital service providers.",
      price: {
        BDT: { monthly: 3499, yearly: 2799 },
        USD: { monthly: 35, yearly: 28 },
      },
      period: isYearly ? "per month, billed annually" : "per month",
      highlight: false,
      cta: "Choose Enterprise",
      href: "/register?plan=enterprise",
      features: [
        "0% Transaction Commission (Direct Wallet)",
        "Up to 25 Connected Android Devices",
        "All Bangladesh MFS + Global Crypto Rails",
        "Multi-Merchant Sub-Accounts & Stores",
        "Dedicated High-Throughput Ingestion Queue",
        "Unlimited Monthly Transaction Volume",
        "99.9% Uptime SLA Guarantee",
        "24/7 Dedicated WhatsApp & Telegram Support",
      ],
      notIncluded: [],
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="emerald" dot>
              Transparent Commercial SaaS
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Simple, Predictable Subscription Pricing
            </h2>
            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Never pay per-transaction percentage fees again. Customer money transfers directly to your personal or agent wallet — keep 100% of your revenue.
            </p>
          </div>
        )}

        {/* Controls: Billing Cycle + Currency Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {/* Monthly / Yearly Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                !isYearly
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isYearly
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Save 20%
              </span>
            </button>
          </div>

          {/* Currency Switcher (BDT / USD) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-semibold">
            <button
              type="button"
              onClick={() => setCurrency("BDT")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "BDT"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              BDT (৳)
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "USD"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
          {plans.map((plan) => {
            const rawPrice = plan.price[currency][billingCycle];
            const priceSymbol = currency === "BDT" ? "৳" : "$";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  plan.highlight
                    ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border-2 border-zinc-900 dark:border-white shadow-2xl lg:-translate-y-2"
                    : "bg-white dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                {/* Header Badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        plan.highlight
                          ? "bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {plan.badge}
                    </span>
                    {plan.highlight && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 dark:text-emerald-600">
                        <Sparkles className="w-3.5 h-3.5" /> High Conversion
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                  <p
                    className={`text-xs mt-2 min-h-[36px] leading-relaxed ${
                      plan.highlight ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mt-6 mb-6 pb-6 border-b border-zinc-200/20 dark:border-zinc-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight">
                        {rawPrice === 0 ? "Free" : `${priceSymbol}${rawPrice.toLocaleString()}`}
                      </span>
                      {rawPrice > 0 && (
                        <span
                          className={`text-xs font-normal ${
                            plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                          }`}
                        >
                          /{billingCycle === "yearly" ? "mo (annual)" : "mo"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-mono mt-1 ${
                        plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                      }`}
                    >
                      {plan.period}
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 text-xs mb-8">
                    <div
                      className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                        plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-400"
                      }`}
                    >
                      Included Features:
                    </div>
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.highlight
                              ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
                              : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}

                    {plan.notIncluded.length > 0 && (
                      <div className="pt-2 space-y-2 opacity-50">
                        {plan.notIncluded.map((feat) => (
                          <div key={feat} className="flex items-center gap-2.5 text-zinc-400 dark:text-zinc-600 line-through">
                            <span className="w-4 text-center font-bold text-xs">✕</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <Link href={plan.href} className="w-full block">
                  <Button
                    size="lg"
                    className={`w-full justify-center font-semibold text-xs tracking-wider uppercase font-mono cursor-pointer ${
                      plan.highlight
                        ? "bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900 shadow-md"
                        : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                    }`}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Lifetime Deal Banner */}
        <div className="rounded-3xl p-8 sm:p-10 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                LIMITED LIFETIME DEAL
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Pay Once · Own Forever
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Agency & Lifetime Access License
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Unlimited Android Companion Devices, zero subscription renewals forever, white-label hosted checkout domain, and priority engineering support for established businesses.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <div className="text-center md:text-right">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
                {currency === "BDT" ? "৳14,999" : "$149"}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">One-Time Payment</div>
            </div>
            <Link href="/register?plan=lifetime">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Claim Lifetime Deal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
