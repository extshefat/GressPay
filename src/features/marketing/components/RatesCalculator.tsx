"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/formatters";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { rates } from "@/content/marketing";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Ccy = "BDT" | "USD" | "USDT";

export function RatesCalculator() {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState<Ccy>("BDT");
  const [to, setTo] = useState<Ccy>("USDT");
  const [map, setMap] = useState<Record<string, number>>({ USD: 1, USDT: 1, BDT: 120 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getExchangeRates()
      .then((res) => {
        if (!alive) return;
        const next: Record<string, number> = { USD: 1, USDT: 1, BDT: 120 };
        Object.assign(next, res.rates || {});
        setMap(next);
        setError(null);
      })
      .catch(() => {
        if (alive) setError("Could not load live rates — showing fallback estimate.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return null;
    const fromRate = map[from] || 1;
    const toRate = map[to] || 1;
    const inUsd = from === "USD" ? n : n / fromRate;
    const out = to === "USD" ? inUsd : inUsd * toRate;
    return out;
  }, [amount, from, to, map]);

  return (
    <MarketingBand id="rates">
      <MarketingHeader kicker={rates.eyebrow} title={rates.title} description={rates.body} />
      <div className="gp-surface mx-auto max-w-xl space-y-4 p-5 sm:p-6" data-elevation="raised">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value as Ccy)}
            options={[
              { value: "BDT", label: "BDT" },
              { value: "USD", label: "USD" },
              { value: "USDT", label: "USDT" },
            ]}
          />
          <Select
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value as Ccy)}
            options={[
              { value: "BDT", label: "BDT" },
              { value: "USD", label: "USD" },
              { value: "USDT", label: "USDT" },
            ]}
          />
        </div>
        <p className="text-2xl font-semibold tabular-nums" data-money aria-live="polite">
          {result == null ? "—" : `${formatNumber(result, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${to}`}
        </p>
        {error && <p className="text-xs text-warning">{error}</p>}
        <p className="text-xs leading-relaxed text-muted">{rates.disclaimer}</p>
      </div>
    </MarketingBand>
  );
}
