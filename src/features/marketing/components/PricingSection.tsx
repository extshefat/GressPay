"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";

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
      badge: "Starter",
      description: "Launch with Bangladesh MFS automation and unlimited payment links.",
      price: {
        BDT: { monthly: 499, yearly: 399 },
        USD: { monthly: 5, yearly: 4 },
      },
      oneTime: false,
      highlight: false,
      cta: "Start with Starter",
      href: "/register?plan=starter",
      features: [
        "0% Transaction Fee",
        "1 Android Companion Device",
        "All Bangladesh MFS: bKash, Nagad, Rocket, Upay",
        "Unlimited Payment Links & Invoices",
        "Standard REST API & Webhooks",
      ],
      notIncluded: ["Full Crypto Suite", "Custom Checkout Branding", "Telegram & Discord Alerts"],
    },
    {
      id: "pro",
      name: "Pro",
      badge: "Most Popular",
      description: "Full MFS + crypto suite with branding and instant alerts.",
      price: {
        BDT: { monthly: 999, yearly: 799 },
        USD: { monthly: 10, yearly: 8 },
      },
      oneTime: false,
      highlight: true,
      cta: "Get Pro",
      href: "/register?plan=pro",
      features: [
        "0% Transaction Fee",
        "Up to 5 Android Companion Devices",
        "All MFS + Full Crypto Suite (USDT TRC20, Binance Pay, Bybit Pay)",
        "Custom Brand Logo & Name on Checkout",
        "Instant Telegram & Discord Alerts",
        "Priority Webhook Retries",
      ],
      notIncluded: ["Unlimited Devices", "Lifetime License"],
    },
    {
      id: "enterprise",
      name: "Enterprise / Lifetime",
      badge: "One-Time License",
      description: "Unlimited scale. Pay once — own the stack forever.",
      price: {
        BDT: { monthly: 9999, yearly: 9999 },
        USD: { monthly: 99, yearly: 99 },
      },
      oneTime: true,
      highlight: false,
      cta: "Buy Lifetime License",
      href: "/register?plan=lifetime",
      features: [
        "Unlimited Android Devices",
        "Unlimited Stores / Brands",
        "Full MFS + Crypto Suite",
        "Dedicated API Rate Limits",
        "Priority 24/7 Support",
        "Everything in Pro, forever",
      ],
      notIncluded: [],
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="slate" dot>
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Commercial SaaS Plans
            </h2>
            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              0% per-transaction fees. Customer money lands in your wallet. Subscribe monthly, save 20% yearly, or buy lifetime.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                !isYearly
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isYearly
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>Yearly</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                Save 20%
              </span>
            </button>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-semibold">
            <button
              type="button"
              onClick={() => setCurrency("BDT")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "BDT"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              BDT (৳)
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "USD"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

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
                    : "bg-white dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-xs"
                }`}
              >
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
                      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-300 dark:text-zinc-600">
                        <Sparkles className="w-3.5 h-3.5" /> Most Popular
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

                  <div className="mt-6 mb-6 pb-6 border-b border-zinc-200/20 dark:border-zinc-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight">
                        {priceSymbol}
                        {rawPrice.toLocaleString()}
                      </span>
                      {!plan.oneTime && (
                        <span
                          className={`text-xs font-normal ${
                            plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                          }`}
                        >
                          /{billingCycle === "yearly" ? "mo billed yearly" : "mo"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-mono mt-1 ${
                        plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                      }`}
                    >
                      {plan.oneTime
                        ? "One-time payment · lifetime access"
                        : isYearly
                        ? "Billed annually (20% savings)"
                        : "Billed monthly"}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs mb-8">
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
                          <div
                            key={feat}
                            className="flex items-center gap-2.5 text-zinc-400 dark:text-zinc-600 line-through"
                          >
                            <span className="w-4 text-center font-bold text-xs">✕</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

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
      </div>
    </section>
  );
};
