"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { DashboardMetrics, Transaction } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ChartContainer, SimpleVolumeChart } from "@/components/ui/chart-container";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  RefreshCw,
  ArrowRight,
  Link2,
  DollarSign,
  Activity,
  ShieldCheck,
  Layers,
  Crown,
  KeyRound,
  Smartphone,
  Sliders,
  Building2,
} from "lucide-react";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const loadData = async (days: 7 | 30 = rangeDays) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [m, txs] = await Promise.all([
        api.getMetrics(days),
        api.getTransactions(),
      ]);
      setMetrics(m);
      setTransactions(txs.transactions?.slice(0, 8) || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(rangeDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  const chartData = useMemo(() => {
    if (!metrics?.volumeHistory?.length) return [];
    return metrics.volumeHistory.map((d) => ({
      label: d.date.slice(5),
      value: Math.round(d.bdt / 120 + d.cryptoUsd),
    }));
  }, [metrics]);

  const maxRail = useMemo(() => {
    const rails = metrics?.railBreakdown || [];
    return Math.max(...rails.map((r) => r.volumeBdt), 1);
  }, [metrics]);

  const sub = metrics?.subscription;
  const planLabel = (sub?.planName || sub?.planId || "Starter").replace(/^\w/, (c) => c.toUpperCase());
  const devicePct = sub ? Math.min(100, Math.round((sub.devicesUsed / Math.max(sub.deviceLimit, 1)) * 100)) : 0;
  const methodPct = sub ? Math.min(100, Math.round((sub.methodsUsed / Math.max(sub.methodLimit, 1)) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Command Center
            </h1>
            <Badge variant="emerald" size="sm" dot>
              Live production
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real settlement metrics for your connected gateways and companion devices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(rangeDays)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Link href="/dashboard/payment-links">
            <Button size="sm" variant="primary" leftIcon={<Link2 className="w-3.5 h-3.5" />}>
              Create Link
            </Button>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="System Notice">
          {errorMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Verified Volume"
          value={metrics ? formatCurrency(metrics.totalRevenueBdt, "BDT") : "৳ 0"}
          icon={<DollarSign className="w-4 h-4" />}
          subtitle={metrics ? `${formatCurrency(metrics.totalRevenueUsd, "USD")} USD equiv.` : undefined}
          loading={isLoading}
        />
        <StatCard
          title="Today's Revenue"
          value={metrics ? formatCurrency(metrics.todayRevenueBdt || 0, "BDT") : "৳ 0"}
          icon={<Activity className="w-4 h-4" />}
          subtitle={metrics ? `${metrics.todayTransactions} settled today` : undefined}
          loading={isLoading}
        />
        <StatCard
          title="Auto-Verification Success"
          value={metrics ? `${metrics.successRate.toFixed(1)}%` : "0.0%"}
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle="Completed sessions / total sessions"
          loading={isLoading}
        />
        <StatCard
          title="Active Gateways & Devices"
          value={
            metrics
              ? `${metrics.activeMethodsCount || 0} / ${(metrics.onlineDevicesCount ?? metrics.connectedDevicesCount) || 0}`
              : "0 / 0"
          }
          icon={<Layers className="w-4 h-4" />}
          subtitle={
            metrics
              ? `${metrics.onlineDevicesCount ?? 0} online · ${metrics.unmatchedSmsCount ?? 0} unmatched SMS · ${metrics.pendingCheckoutCount ?? 0} open checkouts`
              : undefined
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ChartContainer
            title="Revenue Trend"
            description={`${rangeDays}-day verified settlement velocity (USD equivalent).`}
            actions={
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                {([7, 30] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRangeDays(d)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      rangeDays === d
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            }
          >
            <SimpleVolumeChart data={chartData} height={160} />
          </ChartContainer>

          <Card className="p-5 space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Payment Rail Distribution
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Verified volume by rail (bKash, Nagad, Rocket, Upay, Binance Pay, Bybit Pay, USDT TRC20).
              </p>
            </div>
            <div className="space-y-2.5">
              {(metrics?.railBreakdown || []).map((rail) => (
                <div key={rail.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{rail.label}</span>
                    <span className="font-mono text-zinc-500">{formatCurrency(rail.volumeBdt, "BDT")}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                      style={{ width: `${Math.max(2, (rail.volumeBdt / maxRail) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {!metrics?.railBreakdown?.length && (
                <p className="text-xs text-zinc-500 py-4 text-center">No rail volume yet.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Go live on your site</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Run real checkouts with your API keys — plug create/verify into WordPress, Laravel, PHP, or custom code.
            </p>
            <ol className="space-y-2 text-xs">
              {[
                { icon: Building2, label: "Brands & API keys", href: "/dashboard/brands" },
                { icon: Sliders, label: "Configure gateways", href: "/dashboard/methods" },
                { icon: Smartphone, label: "Pair companion APK", href: "/dashboard/devices" },
                { icon: KeyRound, label: "Integration snippets", href: "/dashboard/api-keys" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 font-medium text-zinc-800 hover:border-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-100"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ol>
            <Link href="/developers">
              <Button size="sm" variant="primary" className="w-full">
                View create / verify API docs
              </Button>
            </Link>
          </Card>

          <Card className="p-5 space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Subscription Plan
                </h3>
              </div>
              <Badge variant="slate" size="sm">
                {planLabel}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Devices</span>
                  <span className="font-mono">
                    {sub?.devicesUsed ?? 0}/{sub?.deviceLimit ?? 1}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                  <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${devicePct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Methods</span>
                  <span className="font-mono">
                    {sub?.methodsUsed ?? 0}/{sub?.methodLimit ?? 2}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                  <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${methodPct}%` }} />
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full" onClick={() => setUpgradeOpen(true)}>
              Upgrade Plan
            </Button>
          </Card>

          <Card className="p-5 space-y-3 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h3>
            <Link href="/dashboard/methods" className="block">
              <Button className="w-full" size="sm" variant="outline">
                Configure Gateways
              </Button>
            </Link>
            <Link href="/dashboard/devices" className="block">
              <Button className="w-full" size="sm" variant="outline">
                Pair companion device
              </Button>
            </Link>
            <Link href="/dashboard/transactions" className="block">
              <Button className="w-full" size="sm" variant="outline">
                Browse transactions
              </Button>
            </Link>
            <Link href="/dashboard/api-keys" className="block">
              <Button className="w-full" size="sm" variant="outline">
                Copy API integration
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <Card className="p-5 space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Live Transactions
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Instant status badges with one-click detail view.
            </p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs text-zinc-900 dark:text-zinc-100 hover:underline font-medium flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="When customers pay via your enabled rails, they appear here in real time."
            action={
              <Link href="/dashboard/payment-links">
                <Button size="sm" variant="primary">
                  Create First Payment Link
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-medium">
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {tx.paymentMethodTitle || tx.paymentMethod}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-500 truncate max-w-[160px]">
                      {tx.txid || tx.id}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          tx.status === "COMPLETED"
                            ? "emerald"
                            : tx.status === "PENDING"
                            ? "amber"
                            : "rose"
                        }
                        size="sm"
                        dot
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400 font-mono text-[11px]">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/dashboard/transactions?id=${encodeURIComponent(tx.id)}`}
                        className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Upgrade Subscription Plan">
        <div className="space-y-4 text-xs">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            You are currently on <span className="font-semibold text-zinc-900 dark:text-zinc-100">{planLabel}</span>.
            Choose a higher tier for more companion devices, payment methods, and priority support.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["Starter", "Pro", "Enterprise", "Lifetime"].map((plan) => (
              <div
                key={plan}
                className={`p-4 rounded-xl border ${
                  planLabel.toLowerCase().includes(plan.toLowerCase())
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{plan}</div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {plan === "Starter" && "1 device · 2 methods"}
                  {plan === "Pro" && "3 devices · 5 methods"}
                  {plan === "Enterprise" && "10 devices · unlimited methods"}
                  {plan === "Lifetime" && "Unlimited devices & methods"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500">
            Contact support or wait for Super Admin to assign a plan. Platform upgrade payments use admin receiving wallets.
          </p>
          <div className="flex justify-end">
            <Button size="sm" variant="primary" onClick={() => setUpgradeOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
