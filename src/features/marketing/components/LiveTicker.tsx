"use client";

import React from "react";

const RAIL_NAMES = [
  "bKash",
  "Nagad",
  "Rocket",
  "Upay",
  "Cellfin",
  "USDT TRC-20",
  "Binance Pay",
  "Bybit Pay",
  "Webhooks",
];

export const LiveTicker: React.FC = () => {
  return (
    <div className="w-full border-y border-border dark:border-border bg-card/90 dark:bg-surface/50 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="shrink-0 text-[10px] font-mono font-bold text-muted dark:text-muted tracking-wider uppercase">
          Supported rails
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink dark:text-ink">
          {RAIL_NAMES.map((name, i) => (
            <span key={name} className="inline-flex items-center gap-4">
              <span className="font-semibold text-ink dark:text-ink">{name}</span>
              {i < RAIL_NAMES.length - 1 && (
                <span className="text-muted dark:text-muted hidden sm:inline" aria-hidden>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
