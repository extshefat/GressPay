"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Lock, RefreshCw, Smartphone, Building2 } from "lucide-react";
import Link from "next/link";
import { IntegrationSnippets } from "@/features/developers/IntegrationSnippets";

export default function ApiKeysPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCredentials = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.getApiCredentials();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load integration status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            API keys & snippets
          </h1>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Create a checkout on your server, redirect the buyer to the pay URL, then verify server-side.
            Webhook URL and HMAC secret live under Webhooks & delivery.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCredentials}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      <ol className="grid gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-sm sm:grid-cols-3">
        <li>
          <strong>1. Create</strong>
          <code className="mt-1 block text-xs">POST /api/v1/payment/create</code>
        </li>
        <li>
          <strong>2. Receive</strong>
          <Link href="/dashboard/webhooks" className="mt-1 block text-xs underline">
            Configure and test a signed webhook
          </Link>
        </li>
        <li>
          <strong>3. Verify</strong>
          <code className="mt-1 block text-xs">POST /api/v1/payment/verify</code>
        </li>
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3 border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Brand website API key</h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            One live <code className="font-mono">gp_live_</code> secret per brand for your website or backend. Copy from
            the Brands table — never paste into the Companion app.
          </p>
          <Link href="/dashboard/brands">
            <Button size="sm" variant="primary" className="w-full sm:w-auto">
              Open Brands
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col gap-3 border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Companion device API key</h3>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Each registered phone gets a <code className="font-mono">gpdev_</code> Device API key. Copy from Devices and
            paste into Companion → Setup only.
          </p>
          <Link href="/dashboard/devices">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              Open Devices
            </Button>
          </Link>
        </Card>
      </div>

      <IntegrationSnippets />

      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100" />
        <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
          Brand and device keys stay re-copyable from their tables. Configure webhook URL, rotate HMAC secret, and send
          test pings on{" "}
          <Link href="/dashboard/webhooks" className="font-semibold underline">
            Webhooks & delivery
          </Link>
          . Never put secrets in frontend code.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="API keys">
          {errorMessage}
        </Alert>
      )}
    </div>
  );
}
