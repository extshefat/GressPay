"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight } from "lucide-react";

export interface PricingSectionProps {
  showTitle?: boolean;
}

type BillingCycle = "monthly" | "yearly";
type Currency = "BDT" | "USD";

type PlanDef = {
  id: string;
  name: string;
  badge: string;
  description: string;
  highlight: boolean;
  cta: string;
  href: string;
  isTrial?: boolean;
  price?: Record<Currency, Record<BillingCycle, number>>;
  features: string[];
  notIncluded: string[];
};

export const PricingSection: React.FC<PricingSectionProps> = ({ showTitle = true }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<Currency>("BDT");

  const isYearly = billingCycle === "yearly";

  const plans: PlanDef[] = [
    {
      id: "trial",
      name: "Trial",
      badge: "New accounts",
      description: "Starts automatically when you register. Full MFS automation with a monthly checkout cap.",
      isTrial: true,
      highlight: false,
      cta: "Create account",
      href: "/register",
      features: [
        "0% Transaction Fee",
        "1 Website on Your Account",
        "50 Completed Checkouts / Month (Asia/Dhaka)",
        "1 Android Companion Device",
        "All Bangladesh MFS: bKash, Nagad, Rocket, Upay",
        "Standard REST API & Webhooks",
      ],
      notIncluded: ["Unlimited Checkouts", "Full Crypto Suite", "Custom Checkout Branding"],
    },
    {
      id: "starter",
      name: "Starter",
      badge: "Paid",
      description: "One website with unlimited live checkouts — ideal for a single store.",
      price: {
        BDT: { monthly: 499, yearly: 399 },
        USD: { monthly: 5, yearly: 4 },
      },
      highlight: false,
      cta: "Get Starter",
      href: "/register?plan=starter",
      features: [
        "0% Transaction Fee",
        "1 Website on Your Account",
        "Unlimited Completed Checkouts",
        "1 Android Companion Device",
        "All Bangladesh MFS Rails",
        "Standard REST API & Webhooks",
      ],
      notIncluded: ["Second Website", "Full Crypto Suite", "Telegram & Discord Alerts"],
    },
    {
      id: "premium",
      name: "Premium",
      badge: "Most Popular",
      description: "Two websites, crypto rails, branding, and instant alerts.",
      price: {
        BDT: { monthly: 999, yearly: 799 },
        USD: { monthly: 10, yearly: 8 },
      },
      highlight: true,
      cta: "Get Premium",
      href: "/register?plan=premium",
      features: [
        "0% Transaction Fee",
        "2 Websites on Your Account",
        "Unlimited Completed Checkouts",
        "Up to 3 Android Companion Devices",
        "All MFS + Full Crypto Suite (USDT TRC20, Binance Pay, Bybit Pay)",
        "Custom Brand Logo & Name on Checkout",
        "Instant Telegram & Discord Alerts",
      ],
      notIncluded: ["5+ Websites", "Priority Webhook Retries"],
    },
    {
      id: "pro",
      name: "Pro",
      badge: "Scale",
      description: "Five websites, five devices, and priority webhook retries.",
      price: {
        BDT: { monthly: 1499, yearly: 1199 },
        USD: { monthly: 15, yearly: 12 },
      },
      highlight: false,
      cta: "Get Pro",
      href: "/register?plan=pro",
      features: [
        "0% Transaction Fee",
        "5 Websites on Your Account",
        "Unlimited Completed Checkouts",
        "Up to 5 Android Companion Devices",
        "Full MFS + Crypto Suite",
        "Custom Checkout Branding",
        "Priority Webhook Retries",
      ],
      notIncluded: [],
    },
  ];

  const priceSymbol = currency === "BDT" ? "৳" : "$";

  return (
    <section className="py-20 sm:py-28 bg-void-surface dark:bg-zinc-950 transition-colors">
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
              Start on Trial when you register. Upgrade for more websites and unlimited checkouts — always 0%
              per-transaction fees; customer money lands in your wallet.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                !isYearly
                  ? "bg-void-card text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isYearly
                  ? "bg-void-card text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              <span>Yearly</span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                Save 20%
              </span>
            </button>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 text-xs font-mono font-semibold">
            <button
              type="button"
              onClick={() => setCurrency("BDT")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "BDT"
                  ? "bg-void-card text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-500"
              }`}
            >
              BDT (৳)
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "USD"
                  ? "bg-void-card text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-500"
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch pt-4">
          {plans.map((plan) => {
            const rawPrice = plan.price?.[currency]?.[billingCycle];

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  plan.highlight
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-2 border-zinc-800 dark:border-white shadow-xl xl:-translate-y-1"
                    : "bg-void-card text-zinc-900 dark:text-zinc-100 border border-void-border shadow-card-clean"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        plan.highlight
                          ? "bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-300"
                          : plan.isTrial
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-void-muted text-zinc-700 dark:text-zinc-300 border-void-border"
                      }`}
                    >
                      {plan.badge}
                    </span>
                    {plan.highlight && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-300 dark:text-zinc-600">
                        <Sparkles className="w-3.5 h-3.5" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                  <p
                    className={`text-xs mt-2 min-h-[40px] leading-relaxed ${
                      plan.highlight ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {plan.description}
                  </p>

                  <div
                    className={`mt-5 mb-5 pb-5 border-b ${
                      plan.highlight ? "border-zinc-700/50 dark:border-zinc-300/40" : "border-void-border"
                    }`}
                  >
                    {plan.isTrial ? (
                      <>
                        <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">Free</div>
                        <div className="text-[11px] font-mono mt-1 text-zinc-500 dark:text-zinc-400">
                          Auto-activated on registration · no card required
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
                            {priceSymbol}
                            {rawPrice?.toLocaleString()}
                          </span>
                          <span
                            className={`text-xs font-normal ${
                              plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                            }`}
                          >
                            /{billingCycle === "yearly" ? "mo billed yearly" : "mo"}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-mono mt-1 ${
                            plan.highlight ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                          }`}
                        >
                          {isYearly ? "Billed annually (20% savings)" : "Billed monthly"}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs mb-6">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.highlight
                              ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white"
                              : "bg-zinc-800 text-white dark:bg-white dark:text-zinc-950"
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                    {plan.notIncluded.length > 0 && (
                      <div className="pt-2 space-y-2 opacity-45">
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
                        : plan.isTrial
                        ? "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
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

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-2">
          <Link href="/fees" className="inline-flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-400 hover:underline">
            Full plan details &amp; billing FAQ
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
};
