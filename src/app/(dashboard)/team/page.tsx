"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Key, Link2 } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Team</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Invite operators per brand. Owner retains API keys, billing, and brand switching.
        </p>
      </div>

      <Card className="space-y-4 border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-sm font-bold">Roles (shipping next)</h2>
          <Badge variant="slate" size="sm">
            Preview
          </Badge>
        </div>
        <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Owner</strong> — brands, billing, API
            secrets, revoke devices
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Manager</strong> — gateways, payment
            links, invoices, companion pairing
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-zinc-100">Support</strong> — transactions view +
            resend webhook
          </li>
        </ul>
        <p className="text-[11px] text-zinc-500">
          Multi-brand isolation is live now. Assign gateways and devices per brand under Brands, then
          share Payment Links for each storefront.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/brands"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700"
          >
            <Building2 className="h-3.5 w-3.5" /> Brands
          </Link>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700"
          >
            <Key className="h-3.5 w-3.5" /> API &amp; Webhooks
          </Link>
          <Link
            href="/dashboard/payment-links"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold dark:border-zinc-700"
          >
            <Link2 className="h-3.5 w-3.5" /> Payment Links
          </Link>
        </div>
      </Card>
    </div>
  );
}
