"use client";

import React, { useEffect, useState } from "react";
import { planIdsMatch, planMarketingCode } from "@/lib/plan-utils";
import { api } from "@/lib/api-client";
import {
  AdminMerchant,
  AdminPlan,
  AdminSubscription,
  AdminAuditLog,
  AdminStats,
  PlatformGateway,
  AdminTransaction,
  AdminSmsLog,
  AdminPaymentWallets,
} from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ShieldCheck,
  Users,
  CreditCard,
  History,
  Activity,
  Plus,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Smartphone,
  Radio,
  Sliders,
  Check,
  X,
  Search,
  CheckCheck,
  Zap,
} from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [gateways, setGateways] = useState<PlatformGateway[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [smsLogs, setSmsLogs] = useState<AdminSmsLog[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<
    "gateways" | "merchants" | "pricing" | "health"
  >("gateways");
  const [adminWallets, setAdminWallets] = useState<AdminPaymentWallets>({
    bkash: "",
    nagad: "",
    rocket: "",
    upay: "",
    usdt_trc20: "",
    binance_uid: "",
    bybit_uid: "",
  });
  const [savingWallets, setSavingWallets] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters for Merchants
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantRoleFilter, setMerchantRoleFilter] = useState<"all" | "merchant" | "admin">("all");
  const [merchantStatusFilter, setMerchantStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [merchantPlanFilter, setMerchantPlanFilter] = useState<string>("all");

  // Filters for Transactions
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("all");

  // Filters for SMS
  const [smsSearch, setSmsSearch] = useState("");
  const [smsStatusFilter, setSmsStatusFilter] = useState<string>("all");

  // Credit Adjustment Modal
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchant | null>(null);
  const [creditMode, setCreditMode] = useState<"delta" | "set">("delta");
  const [creditDelta, setCreditDelta] = useState<number>(100);
  const [creditSetBalance, setCreditSetBalance] = useState<number>(1000);
  const [creditReason, setCreditReason] = useState<string>("Manual balance top-up by Super Admin");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // Plan Assignment Modal for Merchant
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [targetMerchant, setTargetMerchant] = useState<AdminMerchant | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>("starter");
  const [targetPlanExpiresAt, setTargetPlanExpiresAt] = useState<string>("");
  const [targetPlanIsLifetime, setTargetPlanIsLifetime] = useState<boolean>(false);
  const [targetBonusCredits, setTargetBonusCredits] = useState<number>(0);
  const [targetPlanReason, setTargetPlanReason] = useState<string>("Complimentary subscription assignment");
  const [isSubmittingPlanAssign, setIsSubmittingPlanAssign] = useState(false);

  // Gateway Limits Modal
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PlatformGateway | null>(null);
  const [gwDisplayName, setGwDisplayName] = useState("");
  const [gwInstructions, setGwInstructions] = useState("");
  const [gwMinAmount, setGwMinAmount] = useState(10);
  const [gwMaxAmount, setGwMaxAmount] = useState(50000);
  const [gwDisplayOrder, setGwDisplayOrder] = useState(1);
  const [isSubmittingGateway, setIsSubmittingGateway] = useState(false);

  // Manual Transaction Resolution Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolvingTx, setResolvingTx] = useState<AdminTransaction | null>(null);
  const [resolveTrxId, setResolveTrxId] = useState("");
  const [resolveNote, setResolveNote] = useState("Manual confirmation verified by Super Admin");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // SaaS Plan Create/Edit Modal
  const [planDefModalOpen, setPlanDefModalOpen] = useState(false);
  const [editingPlanDef, setEditingPlanDef] = useState<AdminPlan | null>(null);
  const [planDefName, setPlanDefName] = useState("");
  const [planDefCode, setPlanDefCode] = useState("");
  const [planDefPriceBdt, setPlanDefPriceBdt] = useState(0);
  const [planDefCredits, setPlanDefCredits] = useState(500);
  const [planDefDescription, setPlanDefDescription] = useState("");
  const [planDefIsFree, setPlanDefIsFree] = useState(false);
  const [isSubmittingPlanDef, setIsSubmittingPlanDef] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [s, m, g, t, sms, p, sub, a, wallets] = await Promise.all([
        api.getAdminStats(),
        api.getAdminMerchants(),
        api.getAdminPlatformGateways().catch(() => ({ gateways: [] })),
        api.getAdminTransactions().catch(() => ({ transactions: [], total: 0 })),
        api.getAdminSmsLogs().catch(() => ({ smsLogs: [], total: 0 })),
        api.getAdminPlans(),
        api.getAdminSubscriptions(),
        api.getAdminAuditLogs(),
        api.getAdminPaymentSettings().catch(() => ({
          wallets: {
            bkash: "",
            nagad: "",
            rocket: "",
            upay: "",
            usdt_trc20: "",
            binance_uid: "",
            bybit_uid: "",
          },
        })),
      ]);
      setStats(s);
      setMerchants(m.merchants || []);
      setGateways(g.gateways || []);
      setTransactions(t.transactions || []);
      setSmsLogs(sms.smsLogs || []);
      setPlans(p.plans || []);
      setSubscriptions(sub.subscriptions || []);
      setAuditLogs(a.auditLogs || []);
      setAdminWallets(wallets.wallets);
      setIsForbidden(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Access denied or failed to load admin console.";
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("privileges")) {
        setIsForbidden(true);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Merchants
  const filteredMerchants = merchants.filter((m) => {
    const q = merchantSearch.toLowerCase().trim();
    const matchSearch =
      q === "" ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.brandName.toLowerCase().includes(q);

    const matchRole =
      merchantRoleFilter === "all" ||
      (merchantRoleFilter === "admin" && (m.role === "admin" || (m as { is_admin?: boolean })?.is_admin)) ||
      (merchantRoleFilter === "merchant" && m.role !== "admin");

    const matchStatus = merchantStatusFilter === "all" || m.status === merchantStatusFilter;
    const matchPlan = planIdsMatch(m.planId, merchantPlanFilter);

    return matchSearch && matchRole && matchStatus && matchPlan;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    const q = txSearch.toLowerCase().trim();
    const matchSearch =
      q === "" ||
      tx.sessionId.toLowerCase().includes(q) ||
      (tx.trxId && tx.trxId.toLowerCase().includes(q)) ||
      (tx.customerNumber && tx.customerNumber.toLowerCase().includes(q)) ||
      tx.merchantEmail.toLowerCase().includes(q) ||
      tx.brandName.toLowerCase().includes(q);

    const matchStatus =
      txStatusFilter === "all" ||
      tx.status === txStatusFilter ||
      (txStatusFilter === "pending" && tx.status === "initiated") ||
      (txStatusFilter === "failed" && (tx.status === "failed" || tx.status === "expired"));
    return matchSearch && matchStatus;
  });

  // Filtered SMS Logs
  const filteredSmsLogs = smsLogs.filter((sms) => {
    const q = smsSearch.toLowerCase().trim();
    const matchSearch =
      q === "" ||
      sms.trxId.toLowerCase().includes(q) ||
      (sms.number && sms.number.toLowerCase().includes(q)) ||
      sms.senderKey.toLowerCase().includes(q) ||
      sms.deviceLabel.toLowerCase().includes(q);

    const matchStatus = smsStatusFilter === "all" || sms.status === smsStatusFilter;
    return matchSearch && matchStatus;
  });

  // Toggle Global Platform Gateway
  const handleToggleGateway = async (gw: PlatformGateway) => {
    const targetStatus = gw.is_enabled === 1 ? 0 : 1;
    // Optimistic update
    setGateways((prev) =>
      prev.map((g) => (g.gateway_code === gw.gateway_code ? { ...g, is_enabled: targetStatus } : g))
    );
    try {
      await api.toggleAdminPlatformGateway(gw.gateway_code);
      setSuccessMessage(
        `${gw.display_name} is now ${targetStatus === 1 ? "ENABLED" : "DISABLED"} globally.`
      );
    } catch (err: unknown) {
      // Revert on failure
      setGateways((prev) =>
        prev.map((g) => (g.gateway_code === gw.gateway_code ? { ...g, is_enabled: gw.is_enabled } : g))
      );
      setErrorMessage(err instanceof Error ? err.message : "Failed to toggle gateway.");
    }
  };

  // Save Gateway Details / Limits
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;
    setIsSubmittingGateway(true);
    setErrorMessage(null);
    try {
      await api.updateAdminPlatformGateway(editingGateway.gateway_code, {
        display_name: gwDisplayName,
        instructions: gwInstructions,
        min_amount: gwMinAmount,
        max_amount: gwMaxAmount,
        display_order: gwDisplayOrder,
      });
      setSuccessMessage(`Updated settings for ${gwDisplayName}.`);
      setGatewayModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update gateway settings.");
    } finally {
      setIsSubmittingGateway(false);
    }
  };

  // Toggle Merchant Role (Admin / Merchant)
  const handleRoleToggle = async (merchant: AdminMerchant) => {
    const nextRole = merchant.role === "admin" ? "merchant" : "admin";
    const promptText =
      nextRole === "admin"
        ? `Promote ${merchant.name} (${merchant.email}) to SUPER ADMIN? They will have full platform control.`
        : `Demote ${merchant.name} (${merchant.email}) to standard account holder?`;

    if (!confirm(promptText)) return;

    try {
      await api.updateAdminMerchantRole(merchant.id, nextRole);
      const roleLabel = nextRole === "merchant" ? "account holder" : nextRole.toUpperCase();
      setSuccessMessage(`Updated ${merchant.name} role to ${roleLabel}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to change account role.");
    }
  };

  // Toggle Merchant Status (Active / Suspended)
  const handleStatusToggle = async (merchant: AdminMerchant) => {
    const nextStatus = merchant.status === "active" ? "suspended" : "active";
    if (!confirm(`Are you sure you want to mark ${merchant.name} as ${nextStatus}?`)) return;
    try {
      await api.updateAdminMerchantStatus(merchant.id, nextStatus);
      setSuccessMessage(`Account ${merchant.name} is now ${nextStatus}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update account status.");
    }
  };

  // Assign Plan to Merchant
  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMerchant) return;
    setIsSubmittingPlanAssign(true);
    setErrorMessage(null);
    try {
      await api.updateAdminMerchantPlan(
        targetMerchant.id,
        targetPlanId,
        targetPlanIsLifetime ? null : (targetPlanExpiresAt || null),
        targetBonusCredits,
        targetPlanIsLifetime,
        targetPlanReason
      );
      setSuccessMessage(`Assigned ${targetPlanId.toUpperCase()} plan to ${targetMerchant.name}.`);
      setPlanModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update account plan.");
    } finally {
      setIsSubmittingPlanAssign(false);
    }
  };

  // Credit Adjustment / Top-up
  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    setIsSubmittingCredit(true);
    setErrorMessage(null);
    try {
      await api.adjustAdminCredit(
        selectedMerchant.id,
        creditMode === "delta" ? creditDelta : 0,
        creditReason,
        creditMode === "set" ? creditSetBalance : null
      );
      setSuccessMessage(`Successfully updated verification credits for ${selectedMerchant.name}.`);
      setCreditModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to adjust credits.");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Resolve Transaction Manually
  const handleResolveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTx) return;
    setIsSubmittingResolve(true);
    setErrorMessage(null);
    try {
      await api.resolveAdminTransaction(resolvingTx.sessionId, resolveTrxId || undefined, resolveNote);
      setSuccessMessage(`Transaction ${resolvingTx.sessionId} resolved & marked COMPLETED.`);
      setResolveModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to resolve transaction.");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  if (isForbidden) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 mx-auto flex items-center justify-center shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Super Admin Privileges Required
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          Your account is not recognized as a Super Admin in the server configuration (<code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">ADMIN_EMAIL</code>).
        </p>
        <div className="pt-2">
          <Button variant="outline" onClick={() => (window.location.href = "/overview")}>
            Return to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Super Admin Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Super Admin Console
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-zinc-900 dark:border-white">
              ROOT ENFORCED
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Platform governance, global payment gateways, account role assignment, and live companion telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={loadData}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <Alert variant="danger" title="Admin Notice" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" title="Success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Stage-2 Tab Bar — 4 control surfaces */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800 scrollbar-none">
        {[
          { key: "gateways", label: "Global Gateway Control", icon: Sliders },
          { key: "merchants", label: "Accounts & subscriptions", icon: Users },
          { key: "pricing", label: "Pricing & Admin Wallets", icon: CreditCard },
          { key: "health", label: "Transactions & Health", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "health" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Verified BDT Volume"
              value={formatCurrency(stats.transactions.volumeBdt, "BDT")}
              change={{ value: `${stats.transactions.completed} Txns`, trend: "up", label: "completed" }}
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatCard
              title="Verified Crypto Volume"
              value={`${stats.transactions.volumeUsdt.toFixed(2)} USDT`}
              change={{ value: "On-Chain", trend: "up", label: "TRON network" }}
              icon={<Coins className="w-4 h-4" />}
            />
            <StatCard
              title="Accounts registered"
              value={stats.merchants.total.toString()}
              change={{ value: `${stats.merchants.active} Active`, trend: "neutral", label: "accounts" }}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Companion Devices"
              value={(stats.devices?.total ?? 0).toString()}
              change={{ value: `${stats.devices?.online ?? 0} Online`, trend: "up", label: "live sync" }}
              icon={<Smartphone className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* System Health Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  System Health & Queue
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> OPERATIONAL
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-zinc-500">Global Gateways Enabled</span>
                  <span className="font-mono font-semibold">{stats.gateways?.enabled ?? 0} of {stats.gateways?.total ?? 8}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-zinc-500">Unmatched / Pending SMS</span>
                  <span className="font-mono font-semibold">{stats.sms?.unmatched ?? 0} messages</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-900">
                  <span className="text-zinc-500">Webhook Health</span>
                  <span className="font-mono font-semibold">{stats.webhooks?.healthPercent ?? 100}% Delivered</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Server UTC Time</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{stats.system.serverTime}</span>
                </div>
              </div>
            </Card>

            {/* Platform Allowlist */}
            <Card className="p-5 space-y-3 md:col-span-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                Authorized Server Super Admins
              </h2>
              <p className="text-xs text-zinc-500">
                Accounts matching these emails in <code className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ADMIN_EMAIL</code> automatically inherit root platform control upon sign in.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {stats.system.adminEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                  >
                    <span className="text-zinc-800 dark:text-zinc-200 truncate pr-2">{email}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                      ROOT
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL PAYMENT GATEWAYS */}
      {activeTab === "gateways" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Platform-Wide Gateway Controls
              </h2>
              <p className="text-xs text-zinc-500">
                Disabling a payment gateway here instantly hides it platform-wide across all dashboards and hosted checkout pages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gateways.map((gw) => {
              const isEnabled = gw.is_enabled === 1;
              return (
                <Card
                  key={gw.gateway_code}
                  className={`p-5 transition-all border ${
                    isEnabled
                      ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {gw.display_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                            gw.category === "crypto"
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
                              : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                          }`}
                        >
                          {gw.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-zinc-500">
                        Code: {gw.gateway_code} • Currency: {gw.currency}
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleGateway(gw)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
                      }`}
                      aria-label={`Toggle ${gw.display_name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
                    <div className="text-zinc-500 font-mono">
                      Limits: {gw.min_amount} – {gw.max_amount} {gw.currency}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGateway(gw);
                        setGwDisplayName(gw.display_name);
                        setGwInstructions(gw.instructions || "");
                        setGwMinAmount(gw.min_amount);
                        setGwMaxAmount(gw.max_amount);
                        setGwDisplayOrder(gw.display_order);
                        setGatewayModalOpen(true);
                      }}
                    >
                      Configure Limits
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MERCHANTS & ROLES */}
      {activeTab === "merchants" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Accounts, roles & SaaS subscriptions
              </h2>
              <p className="text-xs text-zinc-500">
                Promote account holders to Super Admin, assign subscription tiers, modify credit balances, and activate or suspend accounts.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="sm:col-span-1">
              <Input
                placeholder="Search name, email, store..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                value={merchantRoleFilter}
                onChange={(e) => setMerchantRoleFilter(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                <option value="all">All Roles</option>
                <option value="merchant">Account holders only</option>
                <option value="admin">Super Admins Only</option>
              </select>
            </div>
            <div>
              <select
                value={merchantStatusFilter}
                onChange={(e) => setMerchantStatusFilter(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                <option value="all">All Account Status</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>
            <div>
              <select
                value={merchantPlanFilter}
                onChange={(e) => setMerchantPlanFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                <option value="all">All Subscription Plans</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          {/* Merchants Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Account & store</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">SaaS Plan</th>
                  <th className="py-3 px-4">Volume & Devices</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No accounts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((m) => {
                    const isAdmin = m.role === "admin" || (m as { is_admin?: boolean })?.is_admin;
                    const planName = (m.planId || "starter").toUpperCase();
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{m.email}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">Brand: {m.brandName}</div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleRoleToggle(m)}
                            title="Click to toggle role"
                            className={`cursor-pointer px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border transition-colors ${
                              isAdmin
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200"
                            }`}
                          >
                            {isAdmin ? "SUPER ADMIN" : "MERCHANT"}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setTargetMerchant(m);
                              setTargetPlanId(m.planId || "plan_trial");
                              setTargetPlanExpiresAt(m.planExpiresAt ? m.planExpiresAt.split("T")[0] : "");
                              setTargetPlanIsLifetime(m.planId === "lifetime" || !m.planExpiresAt);
                              setTargetBonusCredits(0);
                              setTargetPlanReason(`Complimentary plan upgrade for ${m.name}`);
                              setPlanModalOpen(true);
                            }}
                            className="cursor-pointer text-left group"
                          >
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 group-hover:border-zinc-900 dark:group-hover:border-white transition-colors">
                              {planName} ✎
                            </span>
                            {m.planExpiresAt && (
                              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                                Exp: {m.planExpiresAt.split("T")[0]}
                              </div>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(m.totalVolumeBdt ?? 0, "BDT")}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                            {m.deviceCount ?? 0} Devices • {m.activeGatewaysCount ?? 0} Active Rails
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMerchant(m);
                              setCreditMode("delta");
                              setCreditDelta(500);
                              setCreditSetBalance(m.credits ?? 1000);
                              setCreditReason(`Balance adjustment for ${m.name}`);
                              setCreditModalOpen(true);
                            }}
                            className="cursor-pointer font-mono font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                          >
                            <span>{m.credits.toLocaleString()} credits</span>
                            <span className="text-[10px] text-zinc-400">✎</span>
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(m)}
                            className={`cursor-pointer px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border transition-colors ${
                              m.status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTargetMerchant(m);
                              setTargetPlanId(m.planId || "plan_trial");
                              setTargetPlanExpiresAt(m.planExpiresAt ? m.planExpiresAt.split("T")[0] : "");
                              setTargetPlanIsLifetime(m.planId === "lifetime" || !m.planExpiresAt);
                              setTargetBonusCredits(0);
                              setTargetPlanReason(`Complimentary plan upgrade for ${m.name}`);
                              setPlanModalOpen(true);
                            }}
                          >
                            Plan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedMerchant(m);
                              setCreditMode("delta");
                              setCreditDelta(500);
                              setCreditSetBalance(m.credits ?? 1000);
                              setCreditReason(`Balance adjustment for ${m.name}`);
                              setCreditModalOpen(true);
                            }}
                          >
                            Credits
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM TRANSACTIONS */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Platform-Wide Transactions
              </h2>
              <p className="text-xs text-zinc-500">
                Real-time transaction feed across all accounts. Provides one-click manual approval for edge cases.
              </p>
            </div>
          </div>

          {/* Transaction Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search TrxID, Session ID, Customer number, Account email..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                value={txStatusFilter}
                onChange={(e) => setTxStatusFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed Only</option>
                <option value="pending">Pending Only</option>
                <option value="failed">Failed / Expired Only</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Session & Trx ID</th>
                  <th className="py-3 px-4">Account & store</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No platform transactions match your search.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPending = tx.status === "pending" || tx.status === "initiated";
                    return (
                      <tr key={tx.sessionId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                            {tx.trxId || "PENDING_BUYER_INPUT"}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{tx.sessionId}</div>
                          {tx.customerNumber && (
                            <div className="text-[10px] text-zinc-500 mt-0.5">From: {tx.customerNumber}</div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{tx.brandName}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{tx.merchantEmail}</div>
                        </td>

                        <td className="py-3 px-4 font-mono uppercase">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold">
                            {tx.methodCode || "MFS"}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(tx.amount, tx.currency as any)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                              tx.status === "completed"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                : isPending
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-zinc-500 text-[11px]">
                          {formatDate(tx.createdAt)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setResolvingTx(tx);
                                setResolveTrxId(tx.trxId || "");
                                setResolveNote("Manual verification approved by Super Admin");
                                setResolveModalOpen(true);
                              }}
                            >
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMPANION SMS STREAM */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Live Companion SMS Feed
              </h2>
              <p className="text-xs text-zinc-500">
                Real-time stream of parsed SMS notifications ingested from Companion Android phones.
              </p>
            </div>
          </div>

          {/* SMS Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search Trx ID, Phone number, Device label..."
                value={smsSearch}
                onChange={(e) => setSmsSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                value={smsStatusFilter}
                onChange={(e) => setSmsStatusFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                <option value="all">All SMS States</option>
                <option value="approved">Ready / Unmatched</option>
                <option value="used">Matched & Reconciled</option>
              </select>
            </div>
          </div>

          {/* SMS Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Time Received</th>
                  <th className="py-3 px-4">Rail / Gateway</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Parsed Trx ID</th>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Companion Device</th>
                  <th className="py-3 px-4">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredSmsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No incoming SMS notifications found.
                    </td>
                  </tr>
                ) : (
                  filteredSmsLogs.map((sms) => {
                    const isMatched = sms.status === "used";
                    return (
                      <tr key={sms.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {formatDate(sms.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-zinc-900 dark:border-white">
                            {sms.senderKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          ৳{sms.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {sms.trxId}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-500">
                          {sms.number || "—"}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          <div className="font-semibold">{sms.deviceLabel}</div>
                          <div className="text-[10px] text-zinc-400">{sms.brandName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                              isMatched
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {isMatched ? "MATCHED (USED)" : "READY / UNMATCHED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SAAS PLANS */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                SaaS Subscription Plans
              </h2>
              <p className="text-xs text-zinc-500">
                Commercial tiers defining pricing, device limits, and feature availability for account holders.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </span>
                    <span className="font-mono text-xs text-zinc-500 uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {p.code}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    ৳{p.priceBdt}
                    <span className="text-xs text-zinc-500 font-normal"> / {p.billingCycle}</span>
                  </div>
                  <p className="text-xs text-zinc-500 min-h-[32px]">{p.description}</p>
                  <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    Credit Allowance: {p.creditAllowance} monthly txns
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5 space-y-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Super Admin Receiving Wallets
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Account holders pay these wallets when upgrading plans. MFS numbers and crypto destinations for platform revenue.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["bkash", "bKash Wallet"],
                  ["nagad", "Nagad Wallet"],
                  ["rocket", "Rocket Wallet"],
                  ["upay", "Upay Wallet"],
                  ["usdt_trc20", "USDT TRC20 Address"],
                  ["binance_uid", "Binance UID"],
                  ["bybit_uid", "Bybit UID"],
                ] as const
              ).map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  value={adminWallets[key]}
                  onChange={(e) =>
                    setAdminWallets((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="font-mono text-xs"
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                isLoading={savingWallets}
                onClick={async () => {
                  setSavingWallets(true);
                  try {
                    const res = await api.updateAdminPaymentSettings(adminWallets);
                    setAdminWallets(res.wallets);
                    setSuccessMessage("Admin payment wallets updated.");
                  } catch (err: unknown) {
                    setErrorMessage(err instanceof Error ? err.message : "Failed to save wallets.");
                  } finally {
                    setSavingWallets(false);
                  }
                }}
              >
                Save Admin Payment Settings
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Audit & Governance Trail
            </h2>
            <p className="text-xs text-zinc-500">
              Immutable record of all admin role promotions, plan updates, credit grants, and gateway overrides.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-zinc-500">
                      No admin audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4 text-zinc-500">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {log.actorEmail}
                      </td>
                      <td className="py-3 px-4 uppercase text-zinc-500">{log.targetType}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 truncate max-w-xs">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Gift / Assign SaaS Plan to Merchant */}
      {planModalOpen && targetMerchant && (
        <Modal
          open={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          title={`Gift / Assign SaaS Plan — ${targetMerchant.name}`}
        >
          <form onSubmit={handleAssignPlan} className="space-y-4">
            {/* Merchant Summary Bar */}
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{targetMerchant.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">{targetMerchant.email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold">
                  Current: {(targetMerchant.planId || "starter").toUpperCase()}
                </span>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Balance: {targetMerchant.credits.toLocaleString()} credits
                </div>
              </div>
            </div>

            {/* Plan Tier Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Select Subscription Tier
              </label>
              <select
                value={targetPlanId}
                onChange={(e) => {
                  const p = e.target.value;
                  setTargetPlanId(p);
                  if (p === "plan_lifetime" || p === "lifetime" || planMarketingCode(p) === "lifetime") {
                    setTargetPlanIsLifetime(true);
                    setTargetPlanExpiresAt("");
                  }
                }}
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
              >
                {plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code.toUpperCase()}) — ৳{p.priceBdt} / {p.billingCycle} ({p.creditAllowance.toLocaleString()} credits/mo)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="plan_trial">Trial</option>
                    <option value="plan_starter">Starter (paid)</option>
                    <option value="plan_premium">Premium</option>
                    <option value="plan_pro">Pro</option>
                    <option value="plan_enterprise">Enterprise Plan</option>
                    <option value="plan_lifetime">Lifetime Deal</option>
                  </>
                )}
              </select>
            </div>

            {/* Validity & Duration Options */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Plan Duration & Validity
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={targetPlanIsLifetime}
                    onChange={(e) => {
                      setTargetPlanIsLifetime(e.target.checked);
                      if (e.target.checked) setTargetPlanExpiresAt("");
                    }}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                  />
                  <span>Lifetime Pass (Never Expires)</span>
                </label>
              </div>

              {!targetPlanIsLifetime && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "30 Days", days: 30 },
                      { label: "90 Days", days: 90 },
                      { label: "180 Days", days: 180 },
                      { label: "365 Days", days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + preset.days);
                          setTargetPlanExpiresAt(d.toISOString().split("T")[0]);
                        }}
                        className="py-1 px-2 text-[10px] font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="date"
                    value={targetPlanExpiresAt}
                    onChange={(e) => setTargetPlanExpiresAt(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Bonus Credits Gifting */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Bonus Verification Credits Gift
              </label>
              <Input
                type="number"
                min={0}
                value={targetBonusCredits}
                onChange={(e) => setTargetBonusCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[0, 500, 1000, 2500, 5000, 10000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setTargetBonusCredits(b)}
                    className={`py-0.5 px-2 text-[10px] font-mono rounded border ${
                      targetBonusCredits === b
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    +{b.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Gift / Audit Reason
              </label>
              <Input
                type="text"
                value={targetPlanReason}
                onChange={(e) => setTargetPlanReason(e.target.value)}
                placeholder="e.g. VIP client promo, annual bundle bonus"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingPlanAssign}>
                {isSubmittingPlanAssign ? "Granting Plan..." : "Gift / Save Plan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Credit Adjustment & Account Balance Top-up */}
      {creditModalOpen && selectedMerchant && (
        <Modal
          open={creditModalOpen}
          onClose={() => setCreditModalOpen(false)}
          title={`Account balance & top-up — ${selectedMerchant.name}`}
        >
          <form onSubmit={handleCreditSubmit} className="space-y-4">
            {/* Current Balance Display */}
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{selectedMerchant.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">{selectedMerchant.email}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 uppercase font-mono">Current Balance</div>
                <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {selectedMerchant.credits.toLocaleString()} <span className="text-xs font-normal">credits</span>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
              <button
                type="button"
                onClick={() => setCreditMode("delta")}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                  creditMode === "delta"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Top-up / Adjust (+ / -)
              </button>
              <button
                type="button"
                onClick={() => setCreditMode("set")}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                  creditMode === "set"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Set Exact Balance
              </button>
            </div>

            {creditMode === "delta" ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Credit Delta (Positive to add, Negative to deduct)
                </label>
                <Input
                  type="number"
                  value={creditDelta}
                  onChange={(e) => setCreditDelta(parseInt(e.target.value, 10) || 0)}
                  placeholder="+500 or -100"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[100, 500, 1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditDelta(amt)}
                      className="py-1 px-2 text-[10px] font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                  {[-100, -500, -1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditDelta(amt)}
                      className="py-1 px-2 text-[10px] font-mono rounded border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:border-red-500 transition-colors"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  New balance: <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.max(0, (selectedMerchant.credits || 0) + creditDelta).toLocaleString()}</span> credits
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Set Exact Account Balance
                </label>
                <Input
                  type="number"
                  min={0}
                  value={creditSetBalance}
                  onChange={(e) => setCreditSetBalance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="1000"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[500, 1000, 2500, 5000, 10000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditSetBalance(amt)}
                      className="py-1 px-2 text-[10px] font-mono rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-mono text-zinc-500 mt-2">
                  Balance will be directly set to <span className="font-bold text-zinc-900 dark:text-zinc-100">{creditSetBalance.toLocaleString()}</span> credits
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Audit / Top-up Reason
              </label>
              <Input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="e.g. Manual bKash payment verification top-up"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingCredit}>
                {isSubmittingCredit ? "Saving..." : "Apply Balance Update"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Configure Gateway Limits */}
      {gatewayModalOpen && editingGateway && (
        <Modal
          open={gatewayModalOpen}
          onClose={() => setGatewayModalOpen(false)}
          title={`Gateway Configuration — ${editingGateway.display_name}`}
        >
          <form onSubmit={handleSaveGateway} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Display Name
              </label>
              <Input
                value={gwDisplayName}
                onChange={(e) => setGwDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Min Amount ({editingGateway.currency})
                </label>
                <Input
                  type="number"
                  value={gwMinAmount}
                  onChange={(e) => setGwMinAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Max Amount ({editingGateway.currency})
                </label>
                <Input
                  type="number"
                  value={gwMaxAmount}
                  onChange={(e) => setGwMaxAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Display Order (1 = Top priority)
              </label>
              <Input
                type="number"
                value={gwDisplayOrder}
                onChange={(e) => setGwDisplayOrder(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Customer Instructions
              </label>
              <Input
                value={gwInstructions}
                onChange={(e) => setGwInstructions(e.target.value)}
                placeholder="Step-by-step guidance shown on hosted checkout"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGatewayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingGateway}>
                {isSubmittingGateway ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Manual Resolve Transaction */}
      {resolveModalOpen && resolvingTx && (
        <Modal
          open={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title={`Manual Approval — ${resolvingTx.sessionId}`}
        >
          <form onSubmit={handleResolveTx} className="space-y-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Store:</span>
                <span className="font-semibold">{resolvingTx.brandName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payable Amount:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(resolvingTx.amount, resolvingTx.currency as any)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Method:</span>
                <span className="font-mono uppercase">{resolvingTx.methodCode}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Confirmed Transaction ID (TrxID)
              </label>
              <Input
                value={resolveTrxId}
                onChange={(e) => setResolveTrxId(e.target.value)}
                placeholder="e.g. BL92KJ19Z or manual reference"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Resolution Note (Auditable)
              </label>
              <Input
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Reason for manual approval"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingResolve}>
                {isSubmittingResolve ? "Approving..." : "Confirm & Mark Completed"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
