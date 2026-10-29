"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle, Wifi, BatteryCharging, ArrowRight } from "lucide-react";
import Link from "next/link";

export const CompanionShowcase: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 bg-zinc-50/50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6 space-y-6">
            <Badge variant="emerald" dot>
              Android Companion Node
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
              Turn Any Android Phone into a High-Speed Settlement Node
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
              Customer transfers land directly in your bKash, Nagad, Rocket, Upay, or Cellfin wallet. The Companion APK matches payment SMS in about one second — non-custodial, 0% gateway fee, with WorkManager queuing when the network drops.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    0% Per-Transaction Commission (Direct Wallet)
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Keep 100% of your customer revenue. Money goes straight into your personal bKash or Nagad wallet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Android 12–15 DataSync Foreground Service
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Engineered to run continuously in the background with WorkManager offline queuing — zero missed SMS notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Cryptographic Token Pairing
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Pair your phone in 30 seconds using a unique hashed Device Token. Easily rotate or revoke tokens from your web dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <a href="/download/gresspay-companion.apk">
                <Button variant="primary" size="lg" leftIcon={<Download className="w-4 h-4" />}>
                  Download Companion APK
                </Button>
              </a>
              <Link href="/developers">
                <Button variant="outline" size="lg">
                  API & Pairing Docs
                </Button>
              </Link>
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              v1.1.0 · Android 8.0–15 · /download/gresspay-companion.apk
            </div>
          </div>

          {/* Right Phone Mockup Card */}
          <div className="lg:col-span-6 flex justify-center">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xl rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      GressPay Companion
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">v1.1.0 • Node Active</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE SYNC
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                    <BatteryCharging className="w-3.5 h-3.5" /> 98%
                  </span>
                </div>
              </div>

              {/* Status feed simulator */}
              <div className="py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      bKash SMS Auto-Matched
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      Just now
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    You have received Tk 1,500.00 from 017XXXXXX. TrxID: BKH9948271
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Session: chs_8829a1b</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified in 1.4s</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Nagad SMS Auto-Matched
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      2 mins ago
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    Money Received. Amount: Tk 3,200.00. TxnID: NGD7718291
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Session: chs_9921c3f</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified in 1.1s</span>
                  </div>
                </div>
              </div>

              {/* Heartbeat bar */}
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Node Heartbeat</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Ping 3s ago (HTTP 200 OK)
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
