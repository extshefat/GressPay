"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface MethodItem {
  name: string;
  type: string;
  fee: string;
  status: "active" | "preview";
  tag: string;
}

interface RegionGroup {
  id: string;
  country: string;
  currency: string;
  description: string;
  methods: MethodItem[];
}

const REGIONS: RegionGroup[] = [
  {
    id: "BD",
    country: "Bangladesh",
    currency: "BDT",
    description:
      "Direct wallet transfer via bKash & Nagad. Real-time transaction confirmation powered by GressPay Android SMS Companion.",
    methods: [
      {
        name: "bKash Personal / Merchant",
        type: "Direct Wallet + SMS Match",
        fee: "1.2%",
        status: "active",
        tag: "First Release Active",
      },
      {
        name: "Nagad Personal / Merchant",
        type: "Direct Wallet + SMS Match",
        fee: "1.0%",
        status: "active",
        tag: "First Release Active",
      },
      {
        name: "DBBL Rocket",
        type: "Direct Wallet",
        fee: "1.2%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "UCB Upay",
        type: "Direct Wallet",
        fee: "1.0%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "IBBL Cellfin",
        type: "Digital Wallet",
        fee: "0.8%",
        status: "preview",
        tag: "Catalog Preview",
      },
    ],
  },
  {
    id: "CRYPTO",
    country: "Global Crypto",
    currency: "USDT",
    description:
      "Instant cross-border settlement. Binance Pay uses official merchant checkout APIs, and USDT TRC-20 verifies transactions directly on the TRON blockchain.",
    methods: [
      {
        name: "Binance Pay Official API",
        type: "Server-to-Server API",
        fee: "0.5%",
        status: "active",
        tag: "First Release Active",
      },
      {
        name: "USDT TRC-20 Direct",
        type: "TRON On-Chain Verification",
        fee: "0.0%",
        status: "active",
        tag: "First Release Active",
      },
      {
        name: "Bybit Pay",
        type: "Merchant Gateway",
        fee: "0.6%",
        status: "preview",
        tag: "Catalog Preview",
      },
    ],
  },
  {
    id: "IN",
    country: "India",
    currency: "INR",
    description:
      "Dynamic UPI QR generation and instant PSP settlement. Included in catalog roadmap.",
    methods: [
      {
        name: "UPI Dynamic QR",
        type: "Instant VPA Transfer",
        fee: "0.0%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "PhonePe PG / QR",
        type: "Direct Payment",
        fee: "1.5%",
        status: "preview",
        tag: "Catalog Preview",
      },
    ],
  },
  {
    id: "PK_NP",
    country: "Pakistan & Nepal",
    currency: "PKR / NPR",
    description:
      "Leading mobile wallets across Pakistan and Nepal for regional e-commerce merchants.",
    methods: [
      {
        name: "Easypaisa Direct",
        type: "Mobile Account",
        fee: "1.8%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "JazzCash Direct",
        type: "Mobile Account",
        fee: "1.8%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "eSewa Nepal",
        type: "Digital Wallet",
        fee: "1.5%",
        status: "preview",
        tag: "Catalog Preview",
      },
      {
        name: "Khalti Digital Wallet",
        type: "Digital Wallet",
        fee: "1.5%",
        status: "preview",
        tag: "Catalog Preview",
      },
    ],
  },
];

export const CountryCoverage: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState("BD");
  const currentRegion = REGIONS.find((r) => r.id === selectedRegion) || REGIONS[0];

  return (
    <section id="methods" className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <Badge variant="cyan" dot>
            Supported Rails
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Comprehensive Rail Coverage for South Asia & Crypto
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Configure your enabled rails in your merchant settings. First-release rails are active and ready for production; regional rails are previewed for catalog onboarding.
          </p>
        </div>

        {/* Region Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selectedRegion === region.id
                  ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 shadow-sm"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:border-zinc-800"
              }`}
            >
              <span>{region.country}</span>
              <span className="text-[11px] font-mono opacity-80">({region.currency})</span>
            </button>
          ))}
        </div>

        {/* Region Details Card */}
        <Card className="p-6 sm:p-8 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-zinc-100 dark:border-zinc-800 gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {currentRegion.country}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {currentRegion.description}
              </p>
            </div>
            <Link href="/services">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Detailed Rail Specs
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRegion.methods.map((method, idx) => {
              const isActive = method.status === "active";

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isActive
                      ? "bg-teal-50/30 dark:bg-teal-950/20 border-[#077C74]/30 dark:border-[#1BD1C0]/30 shadow-2xs"
                      : "bg-zinc-50/50 dark:bg-zinc-900/40 border-dashed border-zinc-200 dark:border-zinc-800 opacity-75"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {method.name}
                      </span>
                      {isActive ? (
                        <Badge variant="emerald" size="sm" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="slate" size="sm">
                          Roadmap
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {method.type}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 text-[11px]">Default Fee:</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {method.fee}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
};
