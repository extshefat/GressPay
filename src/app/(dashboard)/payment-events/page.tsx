"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/formatters";
import { Activity, RefreshCw, RotateCw } from "lucide-react";

type DeliveryRow = {
  id: number;
  eventId: string;
  sessionId?: string | null;
  eventName: string;
  url: string;
  httpCode?: number | null;
  status: string;
  note?: string | null;
  attempt: number;
  createdAt: string;
};

export default function PaymentEventsPage() {
  const { success, error: toastError } = useToast();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listWebhookDeliveries();
      setRows(data.deliveries || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load delivery logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (id: number) => {
    setRetrying(id);
    try {
      const res = await api.retryWebhookDelivery(id);
      if (res.ok) {
        success(res.message || "Redelivery accepted.");
      } else {
        toastError(res.message || "Retry failed.");
      }
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setRetrying(null);
    }
  };

  const statusTone = (status: string, code?: number | null) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "delivered" || (code !== null && code !== undefined && code >= 200 && code < 300)) {
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800";
    }
    if (s === "pending") {
      return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800";
    }
    return "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payment events</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Webhook delivery log for your active brand — each HTTP attempt from <code className="font-mono">GpWebhook::dispatch</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/webhooks">
            <Button size="sm" variant="outline">
              Webhook settings
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Delivery logs">
          {error}
        </Alert>
      )}

      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">Loading delivery logs…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-8 w-8 text-zinc-400" />}
            title="No webhook deliveries yet"
            description="Complete a payment or send a test ping from Webhooks to populate this log."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {rows.map((row) => (
                  <tr key={`${row.id}-${row.attempt}-${row.createdAt}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.eventName}</div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[12rem]" title={row.eventId}>
                        {row.eventId}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      {row.sessionId || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">{row.httpCode ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${statusTone(row.status, row.httpCode)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{row.attempt}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retry(row.id)}
                        isLoading={retrying === row.id}
                        leftIcon={<RotateCw className="h-3 w-3" />}
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
