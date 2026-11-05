"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Currency } from "@/lib/types/api";
import { RefreshCw, Scale } from "lucide-react";

type PendingSession = {
  sessionId: string;
  amount: string;
  currency: string;
  methodCode: string;
  status: string;
  trxId: string | null;
  ledgerMode: string;
  expiresAt: string;
  createdAt: string;
};

type UnmatchedSms = {
  id: number;
  rail: string;
  amount: string;
  trxId: string;
  walletHint: string;
  status: string;
  receivedAt: string;
  hasDevice: boolean;
};

export default function ReconciliationPage() {
  const [pending, setPending] = useState<PendingSession[]>([]);
  const [sms, setSms] = useState<UnmatchedSms[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReconciliation();
      setPending(data.pendingSessions || []);
      setSms(data.unmatchedSms || []);
      setNote(data.note || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reconciliation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Reconciliation</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Brand-scoped pending checkouts and unused SMS evidence. Automatic settlement still requires
            server-side match — this view is for review only.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/transactions">
            <Button size="sm" variant="outline">
              Transactions
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            isLoading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {note && (
        <Alert variant="info" title="Manual confirm is separate">
          {note}
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pending sessions ({pending.length})
            </h2>
          </div>
          {pending.length === 0 && !loading ? (
            <EmptyState
              icon={<Scale className="h-5 w-5" />}
              title="No pending checkouts"
              description="Open sessions waiting for SMS or provider evidence will appear here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {pending.map((row) => (
                <li key={row.sessionId} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(Number(row.amount), (row.currency as Currency) || "BDT")} ·{" "}
                        {row.methodCode || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.status} · {row.ledgerMode}
                        {row.trxId ? ` · TxID ${row.trxId}` : " · waiting for TxID / SMS"}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-400">{row.sessionId}</p>
                    </div>
                    <Link
                      href={`/dashboard/transactions`}
                      className="shrink-0 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                    >
                      Review
                    </Link>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Opened {formatDate(row.createdAt)}
                    {row.expiresAt ? ` · expires ${formatDate(row.expiresAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Unused SMS evidence ({sms.length})
            </h2>
          </div>
          {sms.length === 0 && !loading ? (
            <EmptyState
              icon={<Scale className="h-5 w-5" />}
              title="No unused receipts"
              description="Approved SMS that has not settled a checkout will list here."
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sms.map((row) => (
                <li key={row.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.rail} · {formatCurrency(Number(row.amount), "BDT")} · TxID {row.trxId}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {row.status}
                    {row.walletHint ? ` · wallet ${row.walletHint}` : ""}
                    {row.hasDevice ? " · device-linked" : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Received {row.receivedAt ? formatDate(row.receivedAt) : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
