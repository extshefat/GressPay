"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { AccountPlanPayment } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { RefreshCw, ExternalLink, CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function MyPaymentsPage() {
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<AccountPlanPayment[]>([]);
  const [plans, setPlans] = useState<{ code: string; name: string; priceBdt: string }[]>([]);
  const [billingReady, setBillingReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canceledBanner = searchParams.get("canceled") === "1";
  const paidBanner = searchParams.get("paid") === "1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, planRes] = await Promise.all([
        api.getMyPlanPayments(),
        api.getBillingPlans().catch(() => ({ plans: [], billingBrandConfigured: false })),
      ]);
      setPayments(payRes.payments || []);
      setPlans(
        (planRes.plans || []).map((p) => ({
          code: p.code,
          name: p.name,
          priceBdt: p.priceBdt,
        }))
      );
      setBillingReady(Boolean(planRes.billingBrandConfigured));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load payment history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = async (planCode: string) => {
    setBusyId(planCode);
    setError(null);
    try {
      const { order } = await api.createPlanOrder(planCode);
      const url = order.checkoutUrl || (order.sessionId ? `/pay/${order.sessionId}` : null);
      if (!url) throw new Error("Checkout URL missing — contact support.");
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setBusyId(null);
    }
  };

  const statusVariant = (s: string): "emerald" | "amber" | "rose" | "slate" => {
    if (s === "COMPLETED") return "emerald";
    if (s === "PENDING") return "amber";
    if (s === "FAILED" || s === "CANCELED") return "rose";
    return "slate";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Payments
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            GressPay plan upgrades for your account — paid via platform owner gateways (not your brand checkout rails).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}>
          Refresh
        </Button>
      </div>

      {canceledBanner && (
        <Alert variant="success" title="Invoice canceled">
          Your checkout was canceled. You can pay again anytime from a pending row below.
        </Alert>
      )}
      {paidBanner && (
        <Alert variant="success" title="Thank you">
          Payment received — your plan update may take a few seconds to appear on Overview.
        </Alert>
      )}

      {!billingReady && (
        <Alert variant="warning" title="Billing setup pending">
          Platform billing brand is not configured yet. Super Admin must set a billing brand under Admin → Global Gateway Control.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {plans.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Upgrade plan</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {plans.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={!billingReady || busyId === p.code}
                onClick={() => startCheckout(p.code)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-white"
              >
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{p.name}</div>
                <div className="mt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  ৳{p.priceBdt} / month
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Payment ID</th>
              <th className="px-3 py-2">TrxID</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                  No plan payments yet. Choose a plan above to start checkout.
                </td>
              </tr>
            ) : (
              payments.map((row) => {
                const checkout = row.checkoutUrl || (row.sessionId ? `/pay/${row.sessionId}` : null);
                return (
                  <tr key={row.orderId} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-[10px]">{row.orderId}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{row.trxId || "N/A"}</td>
                    <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(row.amount), row.currency as "BDT")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(row.status)} size="sm" dot>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{row.createdAt ? formatDate(row.createdAt) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {row.status === "PENDING" && checkout ? (
                        <Link href={checkout}>
                          <Button size="sm" variant="primary" className="bg-rose-600 hover:bg-rose-700">
                            Pay <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      ) : checkout ? (
                        <Link href={checkout}>
                          <Button size="sm" variant="secondary">
                            View <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-[11px] text-zinc-500 dark:border-zinc-800">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Plan checkout uses the Super Admin billing brand wallets (bKash, Nagad, etc.). Your customer-facing gateways under{" "}
          <Link href="/dashboard/methods" className="font-semibold underline">
            View Gateways
          </Link>{" "}
          stay separate.
        </p>
      </div>
    </div>
  );
}
