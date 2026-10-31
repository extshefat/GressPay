"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Puzzle, Code2 } from "lucide-react";

const TOOLS = [
  {
    title: "GressPay Companion v1.2",
    description:
      "Android SMS verification app. Download the APK, then pair using the Device API key from Dashboard → Devices.",
    href: "/download/gresspay-companion.apk",
    cta: "Download APK",
    icon: Smartphone,
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Apps &amp; Plugins
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Tools and SDKs to connect your store, server, or phone to GressPay.
        </p>
      </div>

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
                <Link href={tool.href} className="mt-4 w-fit">
                  <Button size="sm" variant="primary" leftIcon={<Download className="h-3.5 w-3.5" />}>
                    {tool.cta}
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
