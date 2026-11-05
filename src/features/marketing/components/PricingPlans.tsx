"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { pricing } from "@/content/marketing";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";

export function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  const [usd, setUsd] = useState(false);
  const bdtPerUsd = 122.5;

  const plans = useMemo(() => pricing.plans, []);

  const money = (bdt: number | null) => {
    if (bdt == null) return "Custom";
    if (!usd) return formatCurrency(bdt, "BDT");
    return `$${formatNumber(bdt / bdtPerUsd, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Billing period">
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-semibold ${!yearly ? "bg-card shadow-raised" : ""}`} aria-pressed={!yearly} onClick={() => setYearly(false)}>
            Monthly
          </button>
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-semibold ${yearly ? "bg-card shadow-raised" : ""}`} aria-pressed={yearly} onClick={() => setYearly(true)}>
            Yearly
          </button>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Display currency">
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-semibold ${!usd ? "bg-card shadow-raised" : ""}`} aria-pressed={!usd} onClick={() => setUsd(false)}>
            BDT
          </button>
          <button type="button" className={`rounded-md px-3 py-2 text-xs font-semibold ${usd ? "bg-card shadow-raised" : ""}`} aria-pressed={usd} onClick={() => setUsd(true)}>
            USD est.
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-muted">{pricing.billingNote}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const price =
            plan.id === "lifetime"
              ? money(plan.lifetimeBdt ?? null)
              : money(yearly ? plan.yearlyBdt : plan.monthlyBdt);
          return (
            <article
              key={plan.id}
              className={`gp-plan-card ${plan.highlight ? "ring-2 ring-accent/30" : ""}`}
            >
              <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
              <p className="mt-5 text-3xl font-semibold tabular-nums tracking-tight" data-money>
                {price}
              </p>
              <p className="mt-1 text-xs text-muted">
                {plan.id === "lifetime" ? "One-time BDT unlock" : yearly ? "Per year" : "Per month"}
              </p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={`/register?plan=${plan.id}`} className="mt-6 block">
                <Button type="button" className="w-full" variant={plan.highlight ? "primary" : "secondary"}>
                  Choose {plan.name}
                </Button>
              </Link>
            </article>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="gp-data-table min-w-[40rem]">
          <thead>
            <tr>
              <th scope="col">Compare</th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="text-left font-medium">
                Websites
              </th>
              <td>1</td>
              <td>5</td>
              <td>Up to 50</td>
            </tr>
            <tr>
              <th scope="row" className="text-left font-medium">
                Companion devices
              </th>
              <td>1</td>
              <td>5</td>
              <td>Highest</td>
            </tr>
            <tr>
              <th scope="row" className="text-left font-medium">
                Platform commission
              </th>
              <td>0%</td>
              <td>0%</td>
              <td>0%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-muted">{pricing.trial}</p>
    </div>
  );
}
