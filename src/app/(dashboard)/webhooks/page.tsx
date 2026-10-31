"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { CopyField } from "@/components/ui/copy-field";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, Send, Shield, Webhook as WebhookIcon } from "lucide-react";

export default function WebhookSettingsPage() {
  const { success, error: toastError } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [maskedSecret, setMaskedSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [plainSecret, setPlainSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, creds] = await Promise.all([api.getSettings(), api.getApiCredentials()]);
      setWebhookUrl(settings.webhookUrl || creds.webhookUrl || "");
      setMaskedSecret(creds.webhookSecret || "");
      setHasSecret(Boolean(creds.webhookSecret || (creds as { hasWebhookSecret?: boolean }).hasWebhookSecret));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load webhook settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({ webhookUrl: webhookUrl.trim() });
      success("Webhook URL saved for your active brand.");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not save webhook URL.");
    } finally {
      setSaving(false);
    }
  };

  const rotateSecret = async () => {
    if (
      !window.confirm(
        "Rotate webhook signing secret? Update your server verifier immediately — the old secret stops working."
      )
    ) {
      return;
    }
    setRotating(true);
    try {
      const res = await api.rotateWebhookSecret();
      setPlainSecret(res.webhookSecret);
      setHasSecret(true);
      success("New signing secret generated — copy it now.");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not rotate secret.");
    } finally {
      setRotating(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await api.testWebhookPing();
      if (res.ok) {
        success(res.message || "Test webhook delivered.");
      } else {
        toastError(res.message || `Test failed (HTTP ${res.httpCode ?? "?"})`);
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Test ping failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Webhooks</h1>
          <p className="mt-1 text-xs text-zinc-500">
            HTTPS endpoint for signed <code className="font-mono">payment.completed</code> events on the active brand.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="danger" title="Webhooks">
          {error}
        </Alert>
      )}

      <Card className="border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <WebhookIcon className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Endpoint URL</h2>
        </div>
        <form onSubmit={saveUrl} className="space-y-3">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://yourstore.com/api/webhooks/gresspay"
            required
          />
          <p className="text-[11px] text-zinc-500">
            Must be public HTTPS. Private IPs and non-TLS URLs are rejected server-side (SSRF-safe validation).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save URL"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={sendTest}
              disabled={testing || !webhookUrl.trim()}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send test event
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Signing secret</h2>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          Verify <code className="font-mono">X-GressPay-Signature</code> (HMAC-SHA256 of the raw JSON body). Retries use in-process
          backoff up to <code className="font-mono">WEBHOOK_MAX_RETRIES</code> — each attempt is logged.
        </p>
        {plainSecret ? (
          <CopyField label="New secret (copy now)" value={plainSecret} />
        ) : (
          <CopyField
            label="Current secret"
            value={maskedSecret || (hasSecret ? "gpwh_••••••••" : "No secret yet — rotate to create")}
            canUnmask={false}
          />
        )}
        <Button size="sm" variant="outline" className="mt-3" onClick={rotateSecret} isLoading={rotating}>
          {hasSecret ? "Rotate signing secret" : "Create signing secret"}
        </Button>
      </Card>

      <p className="text-xs text-zinc-500">
        View delivery attempts on{" "}
        <Link href="/dashboard/payment-events" className="font-semibold text-zinc-800 underline dark:text-zinc-200">
          Payment events
        </Link>
        . Website and device API keys live under{" "}
        <Link href="/dashboard/brands" className="font-semibold underline">
          Brands
        </Link>{" "}
        and{" "}
        <Link href="/dashboard/devices" className="font-semibold underline">
          Devices
        </Link>
        .
      </p>
    </div>
  );
}
