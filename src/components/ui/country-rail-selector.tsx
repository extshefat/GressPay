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
    name: "Binance Pay (Merchant API, optional)",
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
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {countries.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCountry(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCountry === c
                ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 font-semibold"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            <div
              key={rail.code}
              onClick={() => toggleRail(rail.code, rail.isFirstRelease)}
              className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                isDisabled
                  ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-dashed border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "bg-teal-50/50 dark:bg-teal-950/20 border-[#077C74] dark:border-[#1BD1C0] cursor-pointer shadow-xs"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
              }`}
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {rail.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
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
                        ? "bg-[#077C74] border-[#077C74] text-white dark:bg-[#1BD1C0] dark:border-[#1BD1C0] dark:text-zinc-950"
                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
