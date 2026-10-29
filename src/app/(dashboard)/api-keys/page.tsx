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
      setErrorMessage(err instanceof Error ? err.message : "Failed to load API credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const rotateKey = async (mode: "live" | "test") => {
    const has =
      mode === "live"
        ? Boolean((credentials as { hasLiveKey?: boolean } | null)?.hasLiveKey ?? credentials?.liveSecretKey)
        : Boolean((credentials as { hasSandboxKey?: boolean } | null)?.hasSandboxKey ?? credentials?.sandboxSecretKey);
    const label = mode === "live" ? "Live" : "Sandbox";
    if (
      has &&
      !window.confirm(
        `Rotate the ${label} API key? The previous secret stops working immediately. The new secret is shown only once.`
      )
    ) {
      return;
    }
    setBusy(`key-${mode}`);
    try {
      const res = await api.rotateApiKey(mode);
      setReveal({
        title: `${label} API secret ${res.created ? "created" : "rotated"}`,
        secret: res.key,
        note: res.note,
      });
      success(res.note, res.created ? "API key created" : "API key rotated");
      await loadCredentials();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not create/rotate API key.");
    } finally {
      setBusy(null);
    }
  };

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
      <IntegrationSnippets />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            API Keys & Webhooks
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Create merchant API keys, reveal the full secret once, and verify HMAC webhook deliveries.
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

      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100" />
        <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
          Full secrets are returned <strong className="font-semibold text-zinc-900 dark:text-zinc-100">only once</strong> when
          you Create or Rotate. List views stay masked on purpose — use the eye toggle on the one-time reveal dialog.
          Never put secrets in frontend code.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Credentials Notice">
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
        <div className="space-y-6">
          <Card className="space-y-4 border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Live Production</h3>
                <Badge variant="emerald" size="sm" dot>
                  Live Ledger
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => rotateKey("live")}
                isLoading={busy === "key-live"}
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                className="!bg-zinc-950 !text-white dark:!bg-white dark:!text-zinc-950"
              >
                {(credentials as { hasLiveKey?: boolean }).hasLiveKey || credentials.liveSecretKey
                  ? "Rotate Live Key"
                  : "Create Live Key"}
              </Button>
            </div>
            <CopyField label="Public key (prefix)" value={credentials.livePublicKey || "Not created yet"} />
            <CopyField
              label="Secret key (masked after create)"
              value={credentials.liveSecretKey || "Create a key to receive the full secret once"}
              masked
              canUnmask={Boolean(credentials.liveSecretKey)}
            />
          </Card>

          <Card className="space-y-4 border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Sandbox Test</h3>
                <Badge variant="slate" size="sm" dot>
                  Test Ledger
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rotateKey("test")}
                isLoading={busy === "key-test"}
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
              >
                {(credentials as { hasSandboxKey?: boolean }).hasSandboxKey || credentials.sandboxSecretKey
                  ? "Rotate Test Key"
                  : "Create Test Key"}
              </Button>
            </div>
            <CopyField label="Public key (prefix)" value={credentials.sandboxPublicKey || "Not created yet"} />
            <CopyField
              label="Secret key (masked after create)"
              value={credentials.sandboxSecretKey || "Create a key to receive the full secret once"}
              masked
              canUnmask={Boolean(credentials.sandboxSecretKey)}
            />
          </Card>

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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={rotateWebhook}
                  isLoading={busy === "webhook"}
                  leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                >
                  {credentials.webhookSecret ? "Rotate Secret" : "Create Secret"}
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
        </div>
      )}
    </div>
  );
}
