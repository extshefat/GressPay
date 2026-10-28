"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CURRENCIES = ["BDT", "USD", "USDT"] as const;

export function RatesCalculator() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<(typeof CURRENCIES)[number]>("USD");
  const [to, setTo] = useState<(typeof CURRENCIES)[number]>("BDT");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1, USDT: 1, BDT: 120 });

  useEffect(() => {
    api
      .getExchangeRates()
      .then((r) => setRates(r.rates as Record<string, number>))
      .catch(() => setRates({}));
  }, []);

  const converted = useMemo(() => {
    const n = parseFloat(amount) || 0;
    const usd = from === "USD" || from === "USDT" ? n : n / (rates[from] || 1);
    const out = to === "USD" || to === "USDT" ? usd : usd * (rates[to] || 1);
    return out;
  }, [amount, from, to, rates]);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Indicative Conversion Rate
          </h2>
          <p className="text-sm text-zinc-500">
            Configured merchant conversion baseline (<code className="font-mono text-xs">GET /api/v1/rates</code>).
          </p>
        </div>
        <Card className="p-6 space-y-4 border-zinc-200 dark:border-zinc-800">
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs">
              <span className="text-zinc-500">From</span>
              <select
                className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                value={from}
                onChange={(e) => setFrom(e.target.value as (typeof CURRENCIES)[number])}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-zinc-500">To</span>
              <select
                className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100"
                value={to}
                onChange={(e) => setTo(e.target.value as (typeof CURRENCIES)[number])}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-2xl font-semibold text-teal-700 dark:text-teal-400 font-mono">
            {converted.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}
          </p>
        </Card>
      </div>
    </section>
  );
}
