"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Smartphone,
  Puzzle,
  Code2,
  Building2,
  Sliders,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const CHECKLIST = [
  {
    step: "1",
    title: "Pair Companion",
    body: "Install the Android Companion APK and pair with a Device API key so SMS can settle MFS payments.",
    href: "/dashboard/devices",
    cta: "Open Devices",
    icon: Smartphone,
  },
  {
    step: "2",
    title: "Configure brand",
    body: "Set brand logo, support contacts, checkout theme, and verification mode (TrxID vs SMS auto) under Brands → Edit Brand.",
    href: "/dashboard/brands",
    cta: "Open Brands",
    icon: Building2,
  },
  {
    step: "3",
    title: "Add gateways",
    body: "Enable receiving wallets for that brand (bKash, Nagad, Binance API keys, USDT, QR). Only live-ready rails appear on checkout.",
    href: "/dashboard/methods",
    cta: "View Gateways",
    icon: Sliders,
  },
  {
    step: "4",
    title: "Test & go live",
    body: "Create a test payment link, send a real SMS on Companion, and confirm the hosted /pay page shows your brand name and logo.",
    href: "/dashboard/payment-links",
    cta: "Payment Links",
    icon: CheckCircle2,
  },
];

const TOOLS = [
  {
    title: "GressPay Companion v1.2",
    description:
      "Android SMS verification app. Required for personal MFS (bKash/Nagad/Rocket/…) and for brands using SMS auto verification.",
    href: "/download/gresspay-companion.apk",
    cta: "Download APK",
    icon: Smartphone,
  },
  {
    title: "PSP minimal sample (PHP)",
    description:
      "Four-step copy-paste: account → API keys → create payment → webhook. Single-file PHP + optional Node.",
    href: "/download/gresspay-psp-example.zip",
    cta: "Download sample zip",
    icon: Code2,
  },
  {
    title: "PHP Library",
    description: "Lightweight helpers for create + verify against the GressPay REST API.",
    href: "https://github.com/extshefat/gresspay/tree/main/sdk/php",
    cta: "View on GitHub",
    icon: Code2,
    external: true,
  },
  {
    title: "WordPress / WooCommerce",
    description: "Starter gateway plugin — redirect checkout to GressPay and verify on return.",
    href: "/download/gresspay-woocommerce.zip",
    cta: "Download plugin zip",
    icon: Puzzle,
  },
  {
    title: "WHMCS Module",
    description: "Billing portal payment gateway module — coming soon.",
    href: "#",
    cta: "Coming soon",
    icon: Puzzle,
    disabled: true,
  },
];

export default function AppsPluginsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Apps &amp; Plugins
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Go-live checklist for Companion SMS, branded checkout, and store SDKs.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Go-live checklist</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Personal MFS and SMS-auto brands need an active Companion device. Binance / USDT use API and on-chain
            proofs instead.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHECKLIST.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.step}
                className="flex flex-col border-zinc-200 p-4 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {item.step}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-zinc-500" />
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.body}</p>
                    <Link href={item.href}>
                      <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                        {item.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Downloads &amp; SDKs</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.title} className="flex flex-col border-zinc-200 p-5 dark:border-zinc-800">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold text-blue-700 dark:text-blue-400">{tool.title}</h2>
                <p className="mt-2 flex-1 text-xs text-zinc-600 dark:text-zinc-400">{tool.description}</p>
                {tool.disabled ? (
                  <Button size="sm" variant="outline" className="mt-4 w-fit" disabled>
                    {tool.cta}
                  </Button>
                ) : tool.external ? (
                  <a href={tool.href} target="_blank" rel="noopener noreferrer" className="mt-4 w-fit">
                    <Button size="sm" variant="primary" leftIcon={<Download className="h-3.5 w-3.5" />}>
                      {tool.cta}
                    </Button>
                  </a>
                ) : (
                  <a href={tool.href} className="mt-4 w-fit" download>
                    <Button size="sm" variant="primary" leftIcon={<Download className="h-3.5 w-3.5" />}>
                      {tool.cta}
                    </Button>
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
