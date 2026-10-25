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
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Link2,
  DollarSign,
  Activity,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companionActive, setCompanionActive] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [m, txs, devices] = await Promise.all([
        api.getMetrics(),
        api.getTransactions().catch(() => ({ transactions: [] })),
        api.listCompanionDevices().catch(() => ({ devices: [] })),
      ]);
      setMetrics(m);
      setTransactions(txs.transactions?.slice(0, 5) || []);
      const hasActiveDevice = devices.devices?.some((d) => d.status === "active");
      setCompanionActive(hasActiveDevice ?? false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartData = useMemo(() => {
    if (!metrics?.volumeHistory?.length) return [];
    return metrics.volumeHistory.map((d) => ({
      label: d.date.slice(5),
      value: Math.round(d.bdt / 120 + d.cryptoUsd),
    }));
  }, [metrics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Overview
            </h1>
            <Badge variant="cyan" size="sm" dot>
              {api.getLedgerMode() === "live" ? "Live Ledger" : "Sandbox Mode"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time settlement metrics, transaction velocity, and provider health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
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

      {/* Rail Health Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* bKash / Nagad Companion */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#077C74] dark:text-[#1BD1C0]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                bKash & Nagad Companion
              </div>
              <div className="text-[11px] text-zinc-500">
                {companionActive ? "Android node listening" : "Pair companion APK"}
              </div>
            </div>
          </div>
          <Badge variant={companionActive ? "emerald" : "amber"} size="sm" dot>
            {companionActive ? "Online" : "Pending Pair"}
          </Badge>
        </div>

        {/* Direct-to-Wallet Architecture */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Direct-to-Wallet Settlement
              </div>
              <div className="text-[11px] text-zinc-500">Non-Custodial · Zero Escrow</div>
            </div>
          </div>
          <Badge variant="emerald" size="sm" dot>
            Protected
          </Badge>
        </div>

        {/* USDT TRC-20 On-Chain */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#077C74] dark:text-[#1BD1C0]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                USDT TRC-20
              </div>
              <div className="text-[11px] text-zinc-500">TRON Network Verifier</div>
            </div>
          </div>
          <Badge variant="emerald" size="sm" dot>
            Synced
          </Badge>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="System Notice">
          {errorMessage}
        </Alert>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Volume (USD)"
          value={metrics ? formatCurrency(metrics.totalRevenueUsd, "USD") : "$0.00"}
          icon={<DollarSign className="w-4 h-4" />}
          change={{ value: "+14.2%", trend: "up", label: "vs last cycle" }}
          loading={isLoading}
        />
        <StatCard
          title="BDT Volume"
          value={metrics ? formatCurrency(metrics.totalRevenueBdt, "BDT") : "৳ 0"}
          icon={<Activity className="w-4 h-4" />}
          change={{ value: "+8.7%", trend: "up", label: "bKash & Nagad" }}
          loading={isLoading}
        />
        <StatCard
          title="Today's Transactions"
          value={metrics ? metrics.todayTransactions : 0}
          icon={<Clock className="w-4 h-4" />}
          subtitle="Settled transactions today"
          loading={isLoading}
        />
        <StatCard
          title="Settlement Success Rate"
          value={metrics ? `${metrics.successRate.toFixed(1)}%` : "0.0%"}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          subtitle="Completed sessions divided by sessions in range"
          loading={isLoading}
        />
      </div>

      {/* Chart & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Volume Trend */}
        <div className="lg:col-span-2">
          <ChartContainer
            title="Volume Velocity"
            description="Consolidated 7-day transaction settlement in USD equivalent."
            actions={
              <Link
                href="/dashboard/transactions"
                className="text-xs text-[#077C74] dark:text-[#1BD1C0] hover:underline font-medium"
              >
                View Ledger Details →
              </Link>
            }
          >
            <SimpleVolumeChart data={chartData} height={160} />
          </ChartContainer>
        </div>

        {/* Balance & Quick Links */}
        <Card className="p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Settlement Ledger
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Available balance and active customer links.
            </p>

            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Pending Settlement:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {metrics ? formatCurrency(metrics.pendingSettlementUsd, "USD") : "$0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Active Payment Links:</span>
                <span className="font-mono font-semibold text-[#077C74] dark:text-[#1BD1C0]">
                  {metrics?.activeLinksCount || 0} Links
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <Link href="/dashboard/payment-links" className="block">
              <Button className="w-full" size="sm" variant="primary" leftIcon={<Link2 className="w-3.5 h-3.5" />}>
                Generate Payment Link
              </Button>
            </Link>
            <Link href="/dashboard/transactions" className="block">
              <Button className="w-full" size="sm" variant="outline">
                Browse Transactions
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Transactions Preview */}
      <Card className="p-5 space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Transactions
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Latest customer payments processed through active rails.
            </p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs text-[#077C74] dark:text-[#1BD1C0] hover:underline font-medium flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="When customers pay via bKash, Nagad, Binance Pay, or USDT, they will appear here in real time."
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
