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
    <div className="w-full border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/50 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="shrink-0 text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
          Supported rails
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-700 dark:text-zinc-300">
          {RAIL_NAMES.map((name, i) => (
            <span key={name} className="inline-flex items-center gap-4">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{name}</span>
              {i < RAIL_NAMES.length - 1 && (
                <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline" aria-hidden>
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
