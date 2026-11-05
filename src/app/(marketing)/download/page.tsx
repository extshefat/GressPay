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
  title: "Download GressPay APK",
  description:
    "Install the GressPay Android app for SMS auto-match on bKash, Nagad, and other MFS wallets you configure.",
};

export default function DownloadPage() {
  return (
    <div className="pt-28 pb-24 bg-white dark:bg-canvas">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-4 text-center sm:text-left">
          <Badge variant="emerald" dot>
            Android app
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink dark:text-ink">
            Download GressPay
          </h1>
          <p className="text-sm sm:text-base text-muted dark:text-muted leading-relaxed max-w-2xl">
            Pair a phone that receives your MFS payment SMS. When a customer pays your bKash, Nagad, Rocket, Upay, or
            Cellfin number, the app matches amount and TrxID to open checkouts — non-custodial, with funds staying in
            wallets you configure.
          </p>
        </div>

        <Card className="p-6 sm:p-8 border-border dark:border-border bg-card/50 dark:bg-surface/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-brand/10 text-accent dark:text-accent">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink dark:text-ink">{COMPANION_APK.fileName}</h2>
                <p className="text-xs text-muted font-mono mt-1">
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

          <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-canvas p-4 space-y-2">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted">SHA-256</p>
            <p className="text-[11px] font-mono text-ink dark:text-ink break-all leading-relaxed">
              {COMPANION_APK.sha256}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <p className="rounded-xl border p-4 text-sm leading-relaxed">
            <strong>Moving from v1.2.2?</strong> Let queued receipts finish syncing on your phone first.
            Then uninstall the old app, install v1.3.2 and pair the phone again in Devices. The new release uses a different signing certificate.
          </p>
          <h3 className="text-base font-semibold text-ink dark:text-ink flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-accent" />
            Setup on the phone
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted dark:text-muted leading-relaxed">
            <li>
              Install the APK, open <span className="font-medium text-ink dark:text-ink">Setup</span>, and
              paste your{" "}
              <code className="font-mono text-xs bg-surface dark:bg-surface px-1 rounded">gpdev_…</code> device API
              key from Dashboard → Devices.
            </li>
            <li>Grant SMS read permission on the SIM that receives payment notifications.</li>
            <li>
              Brand context and API base URL are applied automatically from your account — no manual host entry
              required.
            </li>
          </ol>
          <Card className="p-4 border-warning bg-warning/10 dark:border-warning/50 dark:bg-warning/20 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-warning dark:text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning dark:text-warning leading-relaxed">
              Use a <strong>device</strong> key (<code className="font-mono">gpdev_…</code>) on Setup only. Do not paste
              website keys (<code className="font-mono">gp_live_…</code>) into GressPay — those belong on your
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

        <p className="text-[11px] text-muted leading-relaxed">
          Logged out?{" "}
          <Link href="/register" className="text-accent dark:text-accent hover:underline">
            Create an account
          </Link>{" "}
          first, then register a device to get your <code className="font-mono text-[10px]">gpdev_</code> key.
        </p>
      </div>
    </div>
  );
}
