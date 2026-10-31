import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Download,
  Smartphone,
  ShieldAlert,
  KeyRound,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { COMPANION_APK } from "@/lib/marketing/companion-download";

export const metadata: Metadata = {
  title: "Download Companion APK — GressPay",
  description:
    "Install the GressPay Android Companion for SMS auto-match on bKash, Nagad, and other MFS wallets you configure.",
};

export default function DownloadPage() {
  return (
    <div className="pt-28 pb-24 bg-white dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-4 text-center sm:text-left">
          <Badge variant="emerald" dot>
            Android Companion
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Download GressPay Companion
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Pair a phone that receives your MFS payment SMS. When a customer pays your bKash, Nagad, Rocket, Upay, or
            Cellfin number, the app matches amount and TrxID to open checkouts — non-custodial, with funds staying in
            wallets you configure.
          </p>
        </div>

        <Card className="p-6 sm:p-8 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-teal-600/10 text-teal-700 dark:text-teal-400">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">gresspay-companion.apk</h2>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {COMPANION_APK.versionLabel} · {COMPANION_APK.androidRange} · {COMPANION_APK.sizeLabel}
                </p>
              </div>
            </div>
            <a href={COMPANION_APK.href} className="shrink-0">
              <Button size="lg" variant="primary" leftIcon={<Download className="w-4 h-4" />} className="w-full sm:w-auto">
                Download APK
              </Button>
            </a>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-2">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500">SHA-256</p>
            <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
              {COMPANION_APK.sha256}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-teal-600" />
            Setup on the phone
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <li>
              Install the APK, open <span className="font-medium text-zinc-800 dark:text-zinc-200">Setup</span>, and
              paste your{" "}
              <code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-900 px-1 rounded">gpdev_…</code> device API
              key from Dashboard → Devices.
            </li>
            <li>Grant SMS read permission on the SIM that receives payment notifications.</li>
            <li>
              Brand context and API base URL are applied automatically from your account — no manual host entry
              required.
            </li>
          </ol>
          <Card className="p-4 border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Use a <strong>device</strong> key (<code className="font-mono">gpdev_…</code>) on Setup only. Do not paste
              website keys (<code className="font-mono">gp_live_…</code>) into the Companion — those belong on your
              server or storefront integration.
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/dashboard/devices">
            <Button variant="secondary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Devices in dashboard
            </Button>
          </Link>
          <Link href="/developers">
            <Button variant="outline" size="md" rightIcon={<ExternalLink className="w-4 h-4" />}>
              Pairing &amp; API docs
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Logged out?{" "}
          <Link href="/register" className="text-teal-700 dark:text-teal-400 hover:underline">
            Create an account
          </Link>{" "}
          first, then register a companion device to get your <code className="font-mono text-[10px]">gpdev_</code> key.
        </p>
      </div>
    </div>
  );
}
