"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle, Wifi, BatteryCharging, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const CompanionShowcase: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6 space-y-6">
            <Badge variant="cyan" dot>
              Companion Automation
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              Turn Any Android Phone into a High-Speed Settlement Node
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
              Traditional MFS aggregators in Bangladesh charge high percentage commissions and suffer frequent gateway outages. With GressPay Companion, you receive funds directly into your personal or agent wallet, while our companion app matches transaction SMS messages in under 3 seconds.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Zero Per-Transaction Gateway Percentage
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Keep 100% of your earnings. Funds go straight to your bKash or Nagad wallet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Foreground Service with Wake-Lock
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Engineered to run continuously in the background without Android OS process termination.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    End-to-End Cryptographic Pairing
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Paired securely with one-time bearer tokens. Instantly revocable from the merchant web dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Link href="/dashboard/devices">
                <Button variant="primary" size="md" leftIcon={<Download className="w-4 h-4" />}>
                  Download Companion APK
                </Button>
              </Link>
              <Link href="/help#companion-setup">
                <Button variant="outline" size="md">
                  Pairing Guide
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Phone Mockup Card */}
          <div className="lg:col-span-6 flex justify-center">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xl rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#077C74] dark:text-[#1BD1C0]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      GressPay Companion
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">v1.2.0 • Active Node</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    <Wifi className="w-3.5 h-3.5" /> Live
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                    <BatteryCharging className="w-3.5 h-3.5" /> 98%
                  </span>
                </div>
              </div>

              {/* Status feed simulator */}
              <div className="py-4 space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                      bKash SMS Matched
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                      Just now
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                    You have received Tk 1,500.00 from 017XXXXXX. TrxID: BKH9948271
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400">
                    <span>Session: chs_8829a1b</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verified (2.1s)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Nagad SMS Matched
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      3 mins ago
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    Money Received. Amount: Tk 3,200.00. TxnID: NGD7718291
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Session: chs_9921c3f</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Settled (1.8s)</span>
                  </div>
                </div>
              </div>

              {/* Heartbeat bar */}
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Companion Heartbeat</span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Synced 4s ago
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
