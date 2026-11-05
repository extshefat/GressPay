"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle, Wifi, BatteryCharging, ArrowRight } from "lucide-react";
import Link from "next/link";
import { COMPANION_APK, companionStatusLine } from "@/lib/marketing/companion-download";

export const CompanionShowcase: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 bg-card/50 dark:bg-surface/30 border-t border-border dark:border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left copy */}
          <div className="lg:col-span-6 space-y-6">
            <Badge variant="emerald" dot>
              Android Companion Node
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight leading-tight">
              Android SMS matching for the SIM that receives payments
            </h2>
            <p className="text-muted dark:text-muted text-sm sm:text-base leading-relaxed">
              Customer transfers go to your bKash, Nagad, Rocket, Upay, or Cellfin wallet. The Companion reads provider
              SMS, matches TrxID and amount to open checkouts in about a second, and queues offline when the network
              drops.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success dark:text-success shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-ink dark:text-ink">
                    0% Per-Transaction Commission (Direct Wallet)
                  </span>
                  <p className="text-xs text-muted dark:text-muted">
                    Keep 100% of your customer revenue. Money goes straight into your personal bKash or Nagad wallet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success dark:text-success shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-ink dark:text-ink">
                    Android 12–15 DataSync Foreground Service
                  </span>
                  <p className="text-xs text-muted dark:text-muted">
                    Engineered to run continuously in the background with WorkManager offline queuing — zero missed SMS notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success dark:text-success shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-ink dark:text-ink">
                    Cryptographic Token Pairing
                  </span>
                  <p className="text-xs text-muted dark:text-muted">
                    Pair your phone in 30 seconds using a unique hashed Device Token. Easily rotate or revoke tokens from your web dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Link href="/download">
                <Button variant="primary" size="lg" leftIcon={<Download className="w-4 h-4" />}>
                  Get Companion APK
                </Button>
              </Link>
              <Link href="/developers">
                <Button variant="outline" size="lg">
                  API & Pairing Docs
                </Button>
              </Link>
            </div>
            <div className="text-[11px] font-mono text-muted">
              {COMPANION_APK.versionLabel} · {COMPANION_APK.androidRange} · direct APK on download page
            </div>
          </div>

          {/* Right Phone Mockup Card */}
          <div className="lg:col-span-6 flex justify-center">
            <Card className="w-full max-w-md p-6 bg-white dark:bg-canvas border-border dark:border-border shadow-xl rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-border dark:border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-surface dark:bg-surface-muted text-ink dark:text-ink">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink dark:text-ink">
                      GressPay
                    </h4>
                    <span className="text-[10px] text-muted font-mono">{companionStatusLine()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-success dark:text-success font-bold">
                    <span className="w-2 h-2 rounded-full bg-brand " />
                    LIVE SYNC
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-muted">
                    <BatteryCharging className="w-3.5 h-3.5" /> 98%
                  </span>
                </div>
              </div>

              {/* Status feed simulator */}
              <div className="py-4 space-y-3">
                <div className="p-3 rounded-2xl bg-card dark:bg-surface border border-border dark:border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink dark:text-ink flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      bKash SMS Auto-Matched
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      Just now
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-ink dark:text-ink">
                    You have received Tk 1,500.00 from 017XXXXXX. TrxID: BKH9948271
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-muted font-mono">
                    <span>Session: chs_8829a1b</span>
                    <span className="font-bold text-success dark:text-success">Verified in 1.4s</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card dark:bg-surface border border-border dark:border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink dark:text-ink flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      Nagad SMS Auto-Matched
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      2 mins ago
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-ink dark:text-ink">
                    Money Received. Amount: Tk 3,200.00. TxnID: NGD7718291
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-muted font-mono">
                    <span>Session: chs_9921c3f</span>
                    <span className="font-bold text-success dark:text-success">Verified in 1.1s</span>
                  </div>
                </div>
              </div>

              {/* Heartbeat bar */}
              <div className="p-3 rounded-xl bg-surface dark:bg-surface flex items-center justify-between text-xs font-mono">
                <span className="text-muted">Node Heartbeat</span>
                <span className="text-success dark:text-success font-semibold">
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
