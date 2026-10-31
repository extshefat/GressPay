"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ApiCredentials } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/ui/copy-field";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import {
  RefreshCw,
  Send,
  Lock,
  KeyRound,
  ExternalLink,
  Eye,
  AlertTriangle,
  Smartphone,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { IntegrationSnippets } from "@/features/developers/IntegrationSnippets";

type RevealState = {
  title: string;
  secret: string;
  note: string;
} | null;

export default function ApiKeysPage() {
  const { success, error: toastError } = useToast();

  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealState>(null);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const loadCredentials = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getApiCredentials();
      setCredentials(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load webhook credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const rotateWebhook = async () => {
    if (
      credentials?.webhookSecret &&
      !window.confirm(
        "Rotate the webhook signing secret? Update your server verifier immediately — the old secret stops working."
      )
    ) {
      return;
    }
    setBusy("webhook");
    try {
      const res = await api.rotateWebhookSecret();
      setReveal({
        title: "Webhook signing secret",
        secret: res.webhookSecret,
        note: res.note,
      });
      success(res.note, "Webhook secret ready");
      await loadCredentials();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not rotate webhook secret.");
    } finally {
      setBusy(null);
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingStatus(null);
    try {
      const res = await api.testWebhookPing();
      const msg = res.message || "Webhook test ping dispatched successfully.";
      setPingStatus(msg);
      success(msg, "Webhook Ping Delivered");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook test ping failed.";
      setPingStatus(msg);
      toastError(msg, "Delivery Error");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Webhooks & Integration
          </h1>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Webhooks, HMAC signing, and checkout examples live here. Copy{" "}
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">website keys</strong> from Brands and{" "}
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">device keys</strong> from Devices — this
            page does not issue those secrets.
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
          Webhook signing secrets are shown <strong className="font-semibold text-zinc-900 dark:text-zinc-100">once</strong>{" "}
          when you rotate them. Brand and device keys stay re-copyable from their tables after create or rotate.
          Never put secrets in frontend code.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Webhook Notice">
          {errorMessage}
        </Alert>
      )}

      {reveal && (
        <Card className="space-y-4 border-zinc-950 bg-white p-6 shadow-lg dark:border-white dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{reveal.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">{reveal.note}</p>
            </div>
          </div>
          <CopyField label="Full secret (copy now)" value={reveal.secret} masked canUnmask />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reveal.secret);
                  success("Secret copied to clipboard");
                } catch {
                  toastError("Clipboard blocked — select and copy manually.");
                }
              }}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
            >
              Copy full secret
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReveal(null)}>
              I saved it — dismiss
            </Button>
          </div>
        </Card>
      )}

      {credentials && (
        <Card className="space-y-4 border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Webhook Signature Secret</h3>
              <Badge variant="cyan" size="sm">
                HMAC SHA-256
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                Configure URL
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/dashboard/webhooks"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                Delivery logs
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={rotateWebhook}
                isLoading={busy === "webhook"}
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
              >
                {credentials.webhookSecret || credentials.hasWebhookSecret ? "Rotate Secret" : "Create Secret"}
              </Button>
            </div>
          </div>

          <CopyField
            label="Signing secret (masked after create)"
            value={credentials.webhookSecret || "Create a signing secret"}
            masked
            canUnmask={Boolean(credentials.webhookSecret)}
          />

          <div className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Webhook destination</span>
              <div className="mt-0.5 max-w-sm truncate font-mono text-zinc-500">
                {credentials.webhookUrl || "No endpoint configured (Settings → General)"}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestPing}
              isLoading={isPinging}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send Test Ping
            </Button>
          </div>
          {pingStatus && (
            <div className="rounded-lg bg-zinc-100 p-2.5 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {pingStatus}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
