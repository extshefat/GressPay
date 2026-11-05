"use client";

import React from "react";
import { Badge } from "./badge";
import { Check } from "lucide-react";

export interface RailOption {
  code: string;
  name: string;
  country: string;
  currency: string;
  isFirstRelease: boolean;
  type: "mobile_banking" | "crypto" | "upi" | "wallet";
}

export const SUPPORTED_RAILS: RailOption[] = [
  // First Release
  {
    code: "bkash",
    name: "bKash (SMS match)",
    country: "Bangladesh",
    currency: "BDT",
    isFirstRelease: true,
    type: "mobile_banking",
  },
  {
    code: "nagad",
    name: "Nagad (SMS match)",
    country: "Bangladesh",
    currency: "BDT",
    isFirstRelease: true,
    type: "mobile_banking",
  },
  {
    code: "binance_pay",
    name: "Binance Pay (API, optional)",
    country: "Global",
    currency: "USDT",
    isFirstRelease: true,
    type: "crypto",
  },
  {
    code: "usdt_trc20",
    name: "USDT TRC-20 (on-chain, optional)",
    country: "Global",
    currency: "USDT",
    isFirstRelease: true,
    type: "crypto",
  },

];

export interface CountryRailSelectorProps {
  selectedCodes: string[];
  onChange?: (codes: string[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function CountryRailSelector({
  selectedCodes,
  onChange,
  readOnly = false,
  className = "",
}: CountryRailSelectorProps) {
  const [selectedCountry, setSelectedCountry] = React.useState<string>("All");

  const countries = ["All", "Bangladesh", "Global"];

  const filteredRails = SUPPORTED_RAILS.filter((rail) => {
    if (selectedCountry === "All") return true;
    return rail.country === selectedCountry;
  });

  const toggleRail = (code: string, isFirstRelease: boolean) => {
    if (readOnly || !onChange || !isFirstRelease) return;
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter((c) => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Country Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border dark:border-border">
        {countries.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={selectedCountry === c}
            onClick={() => setSelectedCountry(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCountry === c
                ? "bg-brand text-white dark:bg-brand dark:text-on-brand font-semibold"
                : "text-muted hover:bg-surface dark:text-muted dark:hover:bg-ink-solid"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Rails Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredRails.map((rail) => {
          const isSelected = selectedCodes.includes(rail.code);
          const isDisabled = !rail.isFirstRelease;

          return (
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={readOnly || isDisabled}
              key={rail.code}
              onClick={() => toggleRail(rail.code, rail.isFirstRelease)}
              className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                isDisabled
                  ? "bg-card/50 dark:bg-surface/30 border-dashed border-border dark:border-border opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "bg-accent/10 dark:bg-brand/20 border-accent dark:border-accent cursor-pointer shadow-xs"
                  : "bg-white dark:bg-surface border-border dark:border-border hover:border-border dark:hover:border-border cursor-pointer"
              }`}
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink dark:text-ink">
                    {rail.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted dark:text-muted">
                  <span>{rail.country}</span>
                  <span>•</span>
                  <span className="font-mono font-medium">{rail.currency}</span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {rail.isFirstRelease ? (
                  <Badge variant="emerald" size="sm" dot>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="slate" size="sm">
                    Coming Soon
                  </Badge>
                )}

                {!isDisabled && !readOnly && (
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-brand border-accent text-white dark:bg-brand dark:border-accent dark:text-on-brand"
                        : "border-border dark:border-border bg-white dark:bg-surface-muted"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
