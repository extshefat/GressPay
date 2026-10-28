"use client";

import React, { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    monthly: 0,
    blurb: "A workspace for trying bKash and Nagad SMS matching.",
    points: ["Sign up and configure your own wallets", "Test and live ledgers stay separate", "Credits on a plan row are not charged per checkout"],
  },
  {
    name: "Pro",
    monthly: 1499,
    blurb: "For a shop that also wants optional USDT or Binance Pay setup.",
    points: ["Same verification paths as Starter", "Optional crypto still needs your own credentials", "The operator assigns this plan after sign-up"],
  },
  {
    name: "Enterprise",
    monthly: 4999,
    lifetime: 49990,
    blurb: "A higher recorded allowance. It does not add a webhook worker or an SLA.",
    points: ["Same payment checks as other plans", "Lifetime is a one-time label, not a card charge", "Ask the operator to assign Enterprise or Lifetime"],
  },
];

function money(n: number): string {
  return `৳${n.toLocaleString("en-BD")}`;
}

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="border-t border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">Pricing</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              These are the published plan labels. Signing up does not charge a card. An operator assigns the plan in the admin console. Credits are not deducted when a payment is verified.
            </p>
          </div>
          <div className="flex border border-zinc-300 text-sm dark:border-zinc-700">
            <button type="button" onClick={() => setYearly(false)} className={`px-4 py-2 ${yearly ? "" : "bg-zinc-950 text-white dark:bg-white dark:text-black"}`}>
              Monthly
            </button>
            <button type="button" onClick={() => setYearly(true)} className={`px-4 py-2 ${yearly ? "bg-zinc-950 text-white dark:bg-white dark:text-black" : ""}`}>
              Yearly
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = plan.monthly === 0 ? 0 : yearly ? plan.monthly * 10 : plan.monthly;
            const suffix = plan.monthly === 0 ? "" : yearly ? "/year" : "/month";
            return (
              <article key={plan.name} className="flex flex-col border border-zinc-200 p-6 dark:border-zinc-800">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {money(price)}
                  <span className="text-sm font-normal text-zinc-500">{suffix}</span>
                </p>
                {plan.lifetime && (
                  <p className="mt-1 text-sm text-zinc-500">Lifetime label {money(plan.lifetime)} one time</p>
                )}
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{plan.blurb}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-6 inline-flex h-11 items-center justify-center border border-zinc-950 text-sm font-semibold dark:border-white">
                  Sign up
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
