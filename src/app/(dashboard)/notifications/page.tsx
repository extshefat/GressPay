"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, Bell } from "lucide-react";

type Prefs = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  paymentCompleted: boolean;
  paymentFailed: boolean;
  webhookDeliveryFailed: boolean;
};

const LABELS: { key: keyof Prefs; title: string; hint: string }[] = [
  { key: "emailEnabled", title: "Email notifications", hint: "Master switch for email alerts to your account (when SMTP is configured on the platform)." },
  { key: "inAppEnabled", title: "In-app notifications", hint: "Show payment and webhook alerts inside your dashboard." },
  { key: "paymentCompleted", title: "Payment completed", hint: "Notify when a checkout settles to completed." },
  { key: "paymentFailed", title: "Payment failed / expired", hint: "Notify on failed verification or session expiry." },
  { key: "webhookDeliveryFailed", title: "Webhook delivery failures", hint: "Notify when outbound webhooks fail after retries." },
];

export default function NotificationsPage() {
  const { success, error: toastError } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotificationPrefs();
      setPrefs(data.notifyPrefs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: keyof Prefs) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await api.updateNotificationPrefs(prefs);
      setPrefs(res.notifyPrefs as Prefs);
      success("Notification preferences saved.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Notifications</h1>
          <p className="mt-1 text-xs text-zinc-500">Choose how GressPay should alert you about payments and webhooks.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="danger" title="Notifications">
          {error}
        </Alert>
      )}

      <Card className="border-zinc-200 p-6 dark:border-zinc-800">
        {!prefs ? (
          <p className="text-sm text-zinc-500">{loading ? "Loading…" : "No preferences loaded."}</p>
        ) : (
          <div className="space-y-4">
            {LABELS.map(({ key, title, hint }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={prefs[key]}
                  onChange={() => toggle(key)}
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <Bell className="h-3.5 w-3.5 text-zinc-400" />
                    {title}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
                </span>
              </label>
            ))}
            <Button size="sm" variant="primary" onClick={save} isLoading={saving}>
              Save preferences
            </Button>
          </div>
        )}
      </Card>

      <p className="text-xs text-zinc-500">
        Telegram / Discord instant alerts are configured under{" "}
        <a href="/dashboard/settings" className="font-semibold underline">
          Settings → Instant alerts
        </a>
        .
      </p>
    </div>
  );
}
