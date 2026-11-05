"use client";
import { SupportInbox } from "@/features/dashboard/components/SupportInbox";

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
} from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { DashboardPageHeader } from "@/features/dashboard/components/DashboardPageHeader";
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

function formatCleanNumber(numStr?: string | number | null): string {
  if (numStr === undefined || numStr === null || numStr === "") return "—";
  const n = typeof numStr === "number" ? numStr : parseFloat(String(numStr));
  if (isNaN(n)) return String(numStr);
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

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
    "gateways" | "merchants" | "pricing" | "health" | "support"
  >("gateways");
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

  // Plan Assignment Modal for Merchant
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [targetMerchant, setTargetMerchant] = useState<AdminMerchant | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>("starter");
  const [targetPlanExpiresAt, setTargetPlanExpiresAt] = useState<string>("");
  const [targetPlanIsLifetime, setTargetPlanIsLifetime] = useState<boolean>(false);
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
  const [planDefBillingCycle, setPlanDefBillingCycle] = useState("monthly");
  const [planDefDescription, setPlanDefDescription] = useState("");
  const [planDefIsFree, setPlanDefIsFree] = useState(false);
  const [planDefStatus, setPlanDefStatus] = useState<"active" | "archived" | "disabled">("active");
  const [planDefDeviceLimit, setPlanDefDeviceLimit] = useState(1);
  const [planDefMethodLimit, setPlanDefMethodLimit] = useState(2);
  const [planDefFeatures, setPlanDefFeatures] = useState("");
  const [isSubmittingPlanDef, setIsSubmittingPlanDef] = useState(false);
  const [billingBrandId, setBillingBrandId] = useState("");
  const [billingBrandName, setBillingBrandName] = useState<string | null>(null);
  const [billingLiveGatewayCount, setBillingLiveGatewayCount] = useState(0);
  const [billingBrandOptions, setBillingBrandOptions] = useState<
    { brandId: string; name: string; merchantId: string; liveGatewayCount: number }[]
  >([]);
  const [savingBillingBrand, setSavingBillingBrand] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [s, m, g, t, sms, p, sub, a, billingBrand] = await Promise.all([
        api.getAdminStats(),
        api.getAdminMerchants(),
        api.getAdminPlatformGateways().catch(() => ({ gateways: [] })),
        api.getAdminTransactions().catch(() => ({ transactions: [], total: 0 })),
        api.getAdminSmsLogs().catch(() => ({ smsLogs: [], total: 0 })),
        api.getAdminPlans(),
        api.getAdminSubscriptions(),
        api.getAdminAuditLogs(),
        api.getAdminBillingBrand().catch(() => ({
          billingBrandId: null,
          billingBrandName: null,
          liveGatewayCount: 0,
          brands: [],
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
      setBillingBrandId(billingBrand.billingBrandId || "");
      setBillingBrandName(billingBrand.billingBrandName ?? null);
      setBillingLiveGatewayCount(billingBrand.liveGatewayCount ?? 0);
      setBillingBrandOptions(billingBrand.brands || []);
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
        0,
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

  // SaaS Plan Create/Edit Handlers
  const handleOpenCreatePlan = () => {
    setEditingPlanDef(null);
    setPlanDefName("");
    setPlanDefCode("");
    setPlanDefPriceBdt(999);
    setPlanDefCredits(1000);
    setPlanDefBillingCycle("monthly");
    setPlanDefDescription("Full automation, unlimited websites, priority companion SMS sync.");
    setPlanDefIsFree(false);
    setPlanDefStatus("active");
    setPlanDefDeviceLimit(1);
    setPlanDefMethodLimit(2);
    setPlanDefFeatures("");
    setPlanDefModalOpen(true);
  };

  const handleOpenEditPlan = (p: AdminPlan) => {
    setEditingPlanDef(p);
    setPlanDefName(p.name);
    setPlanDefCode(p.code);
    setPlanDefPriceBdt(p.priceBdt);
    setPlanDefCredits(p.creditAllowance);
    setPlanDefBillingCycle(p.billingCycle || "monthly");
    setPlanDefDescription(p.description || "");
    setPlanDefIsFree(Boolean(p.isFree));
    setPlanDefStatus(p.status || "active");
    setPlanDefDeviceLimit(p.deviceLimit ?? 1);
    setPlanDefMethodLimit(p.methodLimit ?? 2);
    setPlanDefFeatures(Array.isArray(p.features) ? p.features.join("\n") : "");
    setPlanDefModalOpen(true);
  };

  const handleSavePlanDef = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPlanDef(true);
    setErrorMessage(null);
    const features = planDefFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    try {
      if (editingPlanDef) {
        await api.updateAdminPlan(editingPlanDef.id, {
          name: planDefName.trim(),
          description: planDefDescription.trim(),
          priceBdt: Number(planDefPriceBdt),
          creditAllowance: Number(planDefCredits),
          billingCycle: planDefBillingCycle,
          isFree: planDefIsFree,
          status: planDefStatus as any,
          deviceLimit: Number(planDefDeviceLimit),
          methodLimit: Number(planDefMethodLimit),
          features,
        });
        setSuccessMessage(`Plan "${planDefName}" updated successfully.`);
      } else {
        await api.createAdminPlan({
          name: planDefName.trim(),
          code: planDefCode.trim().toLowerCase(),
          priceBdt: Number(planDefPriceBdt),
          creditAllowance: Number(planDefCredits),
          description: planDefDescription.trim(),
          billingCycle: planDefBillingCycle,
          isFree: planDefIsFree,
          deviceLimit: Number(planDefDeviceLimit),
          methodLimit: Number(planDefMethodLimit),
          features,
        });
        setSuccessMessage(`Plan "${planDefName}" created successfully.`);
      }
      setPlanDefModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save plan.");
    } finally {
      setIsSubmittingPlanDef(false);
    }
  };

  if (isForbidden) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-surface dark:bg-surface border border-border dark:border-border text-ink dark:text-ink mx-auto flex items-center justify-center shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
          Super Admin Privileges Required
        </h1>
        <p className="text-xs text-muted dark:text-muted max-w-md mx-auto leading-relaxed">
          Your account is not recognized as a Super Admin in the server configuration (<code className="font-mono text-xs bg-surface dark:bg-surface-muted px-1.5 py-0.5 rounded border border-border dark:border-border">ADMIN_EMAIL</code>).
        </p>
        <div className="pt-2">
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard/overview")}>
            Return to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardPageHeader
        eyebrow="Platform administration"
        title="Control center"
        icon={<ShieldCheck className="h-5 w-5" />}
        badge={
          <span className="rounded-full border border-warning bg-warning/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warning dark:border-warning/60 dark:bg-warning/30 dark:text-warning">
            Root access
          </span>
        }
        description={
          <>
            Platform governance, global payment gateways, account role assignment, and live companion telemetry.
          </>
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={loadData}
          >
            Refresh data
          </Button>
        }
      />

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
      <div className="dashboard-tabs no-scrollbar">
        {[
          { key: "gateways", label: "Global Gateway Control", icon: Sliders },
          { key: "merchants", label: "Accounts & subscriptions", icon: Users },
          { key: "pricing", label: "Pricing & Plans", icon: CreditCard },
          { key: "support", label: "Support inbox", icon: Activity },
          { key: "health", label: "Transactions & Health", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`dashboard-tab ${
                isActive
                  ? "dashboard-tab-active"
                  : ""
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "support" && <SupportInbox />}
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
                <h2 className="text-sm font-bold text-ink dark:text-ink flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  System Health & Queue
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-success dark:text-success font-bold">
                  <span className="w-2 h-2 rounded-full bg-brand " /> OPERATIONAL
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border dark:border-border">
                  <span className="text-muted">Global Gateways Enabled</span>
                  <span className="font-mono font-semibold">{stats.gateways?.enabled ?? 0} of {stats.gateways?.total ?? 8}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border dark:border-border">
                  <span className="text-muted">Unmatched / Pending SMS</span>
                  <span className="font-mono font-semibold">{stats.sms?.unmatched ?? 0} messages</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border dark:border-border">
                  <span className="text-muted">Webhook Health</span>
                  <span className="font-mono font-semibold">{stats.webhooks?.healthPercent ?? 100}% Delivered</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted">Server UTC Time</span>
                  <span className="font-mono text-ink dark:text-ink">{stats.system.serverTime}</span>
                </div>
              </div>
            </Card>

            {/* Platform Allowlist */}
            <Card className="p-5 space-y-3 md:col-span-2">
              <h2 className="text-sm font-bold text-ink dark:text-ink flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ink dark:text-ink" />
                Authorized Server Super Admins
              </h2>
              <p className="text-xs text-muted">
                Accounts matching these emails in <code className="font-mono text-[11px] bg-surface dark:bg-surface-muted px-1 py-0.5 rounded">ADMIN_EMAIL</code> automatically inherit root platform control upon sign in.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {stats.system.adminEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-card dark:bg-surface border border-border dark:border-border text-xs font-mono"
                  >
                    <span className="text-ink dark:text-ink truncate pr-2">{email}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-ink-solid text-white dark:bg-brand dark:text-on-brand">
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
              <h2 className="text-base font-bold text-ink dark:text-ink">
                Platform-Wide Gateway Controls
              </h2>
              <p className="text-xs text-muted">
                Disabling a payment gateway here instantly hides it platform-wide across all dashboards and hosted checkout pages.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted">
            Platform billing brand (plan upgrade wallets) is managed under{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setActiveTab("pricing")}
            >
              Pricing &amp; Plans
            </button>
            .
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gateways.map((gw) => {
              const isEnabled = gw.is_enabled === 1;
              return (
                <Card
                  key={gw.gateway_code}
                  className={`p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    isEnabled
                      ? "hover:border-accent/20 dark:hover:border-accent/20"
                      : "bg-card/60 opacity-70 dark:bg-surface/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink dark:text-ink">
                          {gw.display_name}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                            gw.category === "crypto"
                              ? "bg-surface dark:bg-surface-muted text-ink dark:text-ink border-border dark:border-border"
                              : "bg-ink-solid text-white dark:bg-brand dark:text-on-brand border-border dark:border-white"
                          }`}
                        >
                          {gw.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-muted">
                        Code: {gw.gateway_code} • Currency: {gw.currency}
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleGateway(gw)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-brand dark:bg-brand" : "bg-surface-muted dark:bg-surface-muted"
                      }`}
                      aria-label={`Toggle ${gw.display_name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-surface shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border dark:border-border flex items-center justify-between text-xs">
                    <div className="text-muted font-mono">
                      Limits: {formatCleanNumber(gw.min_amount)} – {formatCleanNumber(gw.max_amount)} {gw.currency}
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
              <h2 className="text-base font-bold text-ink dark:text-ink">
                Accounts, roles & SaaS subscriptions
              </h2>
              <p className="text-xs text-muted">
                Promote business accounts to Super Admin, assign subscription tiers, and activate or suspend (ban) login.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-card dark:bg-surface/50 rounded-xl border border-border dark:border-border">
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
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
          <div className="overflow-x-auto rounded-xl border border-border dark:border-border bg-white dark:bg-canvas">
            <table className="w-full text-left text-xs text-muted dark:text-muted">
              <thead className="bg-card dark:bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-ink dark:text-ink border-b border-border dark:border-border">
                <tr>
                  <th className="py-3 px-4">Account & store</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">SaaS Plan</th>
                  <th className="py-3 px-4">Volume & Devices</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted">
                      No accounts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((m) => {
                    const isAdmin = m.role === "admin" || (m as { is_admin?: boolean })?.is_admin;
                    const planName = (m.planId || "starter").toUpperCase();
                    return (
                      <tr key={m.id} className="hover:bg-card/50 dark:hover:bg-ink-solid/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink dark:text-ink">{m.name}</div>
                          <div className="text-[11px] text-muted font-mono">{m.email}</div>
                          <div className="text-[10px] text-muted mt-0.5">Brand: {m.brandName}</div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleRoleToggle(m)}
                            title="Click to toggle role"
                            className={`cursor-pointer px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border transition-colors ${
                              isAdmin
                                ? "bg-ink-solid text-white dark:bg-brand dark:text-on-brand border-border dark:border-white"
                                : "bg-surface dark:bg-surface-muted text-ink dark:text-ink border-border dark:border-border hover:bg-surface-muted"
                            }`}
                          >
                            {isAdmin ? "SUPER ADMIN" : "BUSINESS"}
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
                              setTargetPlanReason(`Complimentary plan upgrade for ${m.name}`);
                              setPlanModalOpen(true);
                            }}
                            className="cursor-pointer text-left group"
                          >
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border border-border dark:border-border bg-card dark:bg-surface text-ink dark:text-ink group-hover:border-border dark:group-hover:border-white transition-colors">
                              {planName} ✎
                            </span>
                            {m.planExpiresAt && (
                              <div className="text-[10px] text-muted mt-1 font-mono">
                                Exp: {m.planExpiresAt.split("T")[0]}
                              </div>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-ink dark:text-ink">
                            {formatCurrency(m.totalVolumeBdt ?? 0, "BDT")}
                          </div>
                          <div className="text-[10px] text-muted mt-0.5 font-mono">
                            {m.deviceCount ?? 0} Devices • {m.activeGatewaysCount ?? 0} Active Rails
                          </div>
                        </td>



                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(m)}
                            title={
                              m.status === "active"
                                ? "Click to suspend (ban login)"
                                : "Click to restore access"
                            }
                            className={`cursor-pointer px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border transition-colors ${
                              m.status === "active"
                                ? "bg-success/10 dark:bg-success/40 text-success dark:text-success border-success dark:border-success"
                                : "bg-danger/10 dark:bg-danger/40 text-danger dark:text-danger border-danger dark:border-danger"
                            }`}
                          >
                            {m.status === "active" ? "ACTIVE" : "SUSPENDED / BAN"}
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
                              setTargetPlanReason(`Complimentary plan upgrade for ${m.name}`);
                              setPlanModalOpen(true);
                            }}
                          >
                            Plan
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
              <h2 className="text-base font-bold text-ink dark:text-ink">
                Platform-Wide Transactions
              </h2>
              <p className="text-xs text-muted">
                Real-time transaction feed across all accounts. Review submitted references for manual payment methods.
              </p>
            </div>
          </div>

          {/* Transaction Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-card dark:bg-surface/50 rounded-xl border border-border dark:border-border">
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed Only</option>
                <option value="pending">Pending Only</option>
                <option value="failed">Failed / Expired Only</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-xl border border-border dark:border-border bg-white dark:bg-canvas">
            <table className="w-full text-left text-xs text-muted dark:text-muted">
              <thead className="bg-card dark:bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-ink dark:text-ink border-b border-border dark:border-border">
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
              <tbody className="divide-y divide-border dark:divide-border">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted">
                      No platform transactions match your search.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPending = tx.status === "pending" && tx.trxId && tx.methodCode && !["bkash", "nagad", "rocket", "upay", "cellfin", "usdt_trc20", "binance_pay"].includes(tx.methodCode);
                    return (
                      <tr key={tx.sessionId} className="hover:bg-card/50 dark:hover:bg-ink-solid/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-ink dark:text-ink">
                            {tx.trxId || "PENDING_BUYER_INPUT"}
                          </div>
                          <div className="text-[10px] text-muted font-mono mt-0.5">{tx.sessionId}</div>
                          {tx.customerNumber && (
                            <div className="text-[10px] text-muted mt-0.5">From: {tx.customerNumber}</div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink dark:text-ink">{tx.brandName}</div>
                          <div className="text-[11px] text-muted font-mono">{tx.merchantEmail}</div>
                        </td>

                        <td className="py-3 px-4 font-mono uppercase">
                          <span className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-muted text-ink dark:text-ink text-[10px] font-bold">
                            {tx.methodCode || "MFS"}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-ink dark:text-ink">
                          {formatCurrency(tx.amount, tx.currency as any)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                              tx.status === "completed"
                                ? "bg-success/10 dark:bg-success/40 text-success dark:text-success border-success dark:border-success"
                                : isPending
                                ? "bg-warning/10 dark:bg-warning/40 text-warning dark:text-warning border-warning dark:border-warning"
                                : "bg-danger/10 dark:bg-danger/40 text-danger dark:text-danger border-danger dark:border-danger"
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-muted text-[11px]">
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
                                setResolveNote("");
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
              <h2 className="text-base font-bold text-ink dark:text-ink">
                Live Companion SMS Feed
              </h2>
              <p className="text-xs text-muted">
                Real-time stream of parsed SMS notifications ingested from Companion Android phones.
              </p>
            </div>
          </div>

          {/* SMS Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-card dark:bg-surface/50 rounded-xl border border-border dark:border-border">
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
              >
                <option value="all">All SMS States</option>
                <option value="approved">Ready / Unmatched</option>
                <option value="used">Matched & Reconciled</option>
              </select>
            </div>
          </div>

          {/* SMS Table */}
          <div className="overflow-x-auto rounded-xl border border-border dark:border-border bg-white dark:bg-canvas">
            <table className="w-full text-left text-xs text-muted dark:text-muted">
              <thead className="bg-card dark:bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-ink dark:text-ink border-b border-border dark:border-border">
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
              <tbody className="divide-y divide-border dark:divide-border">
                {filteredSmsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted">
                      No incoming SMS notifications found.
                    </td>
                  </tr>
                ) : (
                  filteredSmsLogs.map((sms) => {
                    const isMatched = sms.status === "used";
                    return (
                      <tr key={sms.id} className="hover:bg-card/50 dark:hover:bg-ink-solid/30 transition-colors">
                        <td className="py-3 px-4 text-muted font-mono text-[11px]">
                          {formatDate(sms.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-ink-solid text-white dark:bg-brand dark:text-on-brand border border-border dark:border-white">
                            {sms.senderKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-ink dark:text-ink">
                          ৳{sms.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-ink dark:text-ink">
                          {sms.trxId}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted">
                          {sms.number || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted dark:text-muted">
                          <div className="font-semibold">{sms.deviceLabel}</div>
                          <div className="text-[10px] text-muted">{sms.brandName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                              isMatched
                                ? "bg-success/10 dark:bg-success/40 text-success dark:text-success border-success dark:border-success"
                                : "bg-warning/10 dark:bg-warning/40 text-warning dark:text-warning border-warning dark:border-warning"
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
              <h2 className="text-base font-bold text-ink dark:text-ink">
                SaaS Subscription Plans
              </h2>
              <p className="text-xs text-muted">
                Commercial tiers defining pricing, transaction limits, and feature availability for account holders.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreatePlan}
            >
              Create New Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between border border-border dark:border-border bg-white dark:bg-canvas shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-ink dark:text-ink">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                        p.status === "active"
                          ? "bg-success/10 text-success dark:text-success border-success/20"
                          : "bg-surface dark:bg-surface-muted text-muted border-border dark:border-border"
                      }`}>
                        {p.status || "active"}
                      </span>
                      <span className="font-mono text-xs text-muted uppercase bg-surface dark:bg-surface-muted px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono text-ink dark:text-ink">
                    ৳{p.priceBdt}
                    <span className="text-xs text-muted font-normal"> / {p.billingCycle}</span>
                  </div>
                  <p className="text-xs text-muted min-h-[32px]">{p.description}</p>
                  <div className="space-y-1 text-xs font-mono text-ink dark:text-ink pt-2 border-t border-border dark:border-border">
                    <div className="flex justify-between">
                      <span className="text-muted">Monthly Trx Limit:</span>
                      <span className="font-semibold">{p.creditAllowance >= 999999 ? "Unlimited" : (p.creditAllowance || 50) + " / month"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Devices:</span>
                      <span className="font-semibold">{p.deviceLimit ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Gateways:</span>
                      <span className="font-semibold">{p.methodLimit ?? "—"}</span>
                    </div>
                    {p.isFree ? (
                      <div className="text-[11px] text-warning dark:text-warning font-sans font-medium">Free Tier Account</div>
                    ) : null}
                  </div>
                </div>
                <div className="pt-4 mt-3 border-t border-border dark:border-border flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditPlan(p)}
                  >
                    Edit Plan Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-5 space-y-3 border border-warning dark:border-warning/50 bg-warning/10 dark:bg-warning/20">
            <div>
              <h3 className="text-sm font-bold text-ink dark:text-ink">
                Account plan billing brand
              </h3>
              <p className="text-xs text-muted dark:text-muted mt-1">
                Businesses pay for subscriptions through this brand&apos;s live gateways (My Payments → checkout). Pick a brand
                that already has receiving wallets under View Gateways. Brand ID is also shown on the Brands page.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="block text-xs font-medium text-muted dark:text-muted">
                  Billing brand ID
                </label>
                <select
                  value={billingBrandId}
                  onChange={(e) => setBillingBrandId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 dark:border-border dark:bg-surface dark:text-ink dark:focus:border-accent"
                >
                  <option value="">Select brand (brd_…)</option>
                  {billingBrandOptions.map((b) => (
                    <option key={b.brandId} value={b.brandId}>
                      {b.name} — {b.brandId} ({b.liveGatewayCount} live gateway
                      {b.liveGatewayCount === 1 ? "" : "s"})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="primary"
                className="self-end"
                isLoading={savingBillingBrand}
                disabled={!billingBrandId.trim()}
                onClick={async () => {
                  setSavingBillingBrand(true);
                  setErrorMessage(null);
                  try {
                    await api.setAdminBillingBrand(billingBrandId.trim());
                    setSuccessMessage("Billing brand saved. Plan upgrades will use this brand's gateways.");
                    await loadData();
                  } catch (err: unknown) {
                    setErrorMessage(err instanceof Error ? err.message : "Failed to save billing brand.");
                  } finally {
                    setSavingBillingBrand(false);
                  }
                }}
              >
                Save billing brand
              </Button>
            </div>
            {billingBrandName ? (
              <p className="text-[11px] text-muted dark:text-muted">
                Active: <span className="font-semibold">{billingBrandName}</span>
                {" · "}
                <span className="font-mono">{billingBrandId}</span>
                {" · "}
                {billingLiveGatewayCount} usable gateway{billingLiveGatewayCount === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-[11px] text-warning dark:text-warning">
                No billing brand set yet. Select a brand with live gateways above.
              </p>
            )}
            {billingBrandId && billingLiveGatewayCount < 1 && (
              <p className="text-[11px] text-warning dark:text-warning">
                This brand has no active receiving gateways yet. Add wallets under that brand&apos;s View Gateways
                before merchants can pay.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink dark:text-ink">
              Audit & Governance Trail
            </h2>
            <p className="text-xs text-muted">
              Immutable record of all admin role promotions, plan updates, and gateway overrides.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border dark:border-border bg-white dark:bg-canvas">
            <table className="w-full text-left text-xs text-muted dark:text-muted">
              <thead className="bg-card dark:bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-ink dark:text-ink border-b border-border dark:border-border">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted">
                      No admin audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-card/50 dark:hover:bg-ink-solid/30">
                      <td className="py-3 px-4 text-muted">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-ink dark:text-ink">
                        {log.actorEmail}
                      </td>
                      <td className="py-3 px-4 uppercase text-muted">{log.targetType}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded bg-surface dark:bg-surface-muted text-ink dark:text-ink">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted truncate max-w-xs">
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
            <div className="p-3 rounded-lg border border-border dark:border-border bg-card dark:bg-surface/50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-ink dark:text-ink">{targetMerchant.name}</div>
                <div className="text-[11px] text-muted font-mono">{targetMerchant.email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink font-bold">
                  Current: {(targetMerchant.planId || "starter").toUpperCase()}
                </span>

              </div>
            </div>

            {/* Plan Tier Selection */}
            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
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
                className="w-full text-xs rounded-lg border border-border dark:border-border bg-white dark:bg-surface text-ink dark:text-ink px-3 py-2"
              >
                {plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code.toUpperCase()}) — ৳{p.priceBdt} / {p.billingCycle}
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
                <label className="text-xs font-semibold text-ink dark:text-ink">
                  Plan Duration & Validity
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-ink dark:text-ink">
                  <input
                    type="checkbox"
                    checked={targetPlanIsLifetime}
                    onChange={(e) => {
                      setTargetPlanIsLifetime(e.target.checked);
                      if (e.target.checked) setTargetPlanExpiresAt("");
                    }}
                    className="rounded border-border text-ink focus:ring-0"
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
                        className="py-1 px-2 text-[10px] font-mono rounded border border-border dark:border-border bg-card dark:bg-surface hover:border-border dark:hover:border-border transition-colors"
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

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
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

      {/* MODAL 3: Configure Gateway Limits */}
      {gatewayModalOpen && editingGateway && (
        <Modal
          open={gatewayModalOpen}
          onClose={() => setGatewayModalOpen(false)}
          title={`Gateway Configuration — ${editingGateway.display_name}`}
        >
          <form onSubmit={handleSaveGateway} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                Display Name
              </label>
              <Input
                value={gwDisplayName}
                onChange={(e) => setGwDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Min Amount ({editingGateway.currency})
                </label>
                <Input
                  type="number"
                  value={gwMinAmount}
                  onChange={(e) => setGwMinAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
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
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                Display Order (1 = Top priority)
              </label>
              <Input
                type="number"
                value={gwDisplayOrder}
                onChange={(e) => setGwDisplayOrder(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
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
            <div className="p-3 bg-card dark:bg-surface rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Store:</span>
                <span className="font-semibold">{resolvingTx.brandName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payable Amount:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(resolvingTx.amount, resolvingTx.currency as any)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payment Method:</span>
                <span className="font-mono uppercase">{resolvingTx.methodCode}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                Confirmed Transaction ID (TrxID)
              </label>
              <Input
                value={resolveTrxId}
                readOnly
                placeholder="e.g. BL92KJ19Z or manual reference"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
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

      {/* MODAL 5: Create / Edit SaaS Plan Definition */}
      {planDefModalOpen && (
        <Modal
          open={planDefModalOpen}
          onClose={() => setPlanDefModalOpen(false)}
          title={editingPlanDef ? `Edit SaaS Plan — ${editingPlanDef.name}` : "Create New SaaS Plan"}
        >
          <form onSubmit={handleSavePlanDef} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Plan Name
                </label>
                <Input
                  value={planDefName}
                  onChange={(e) => setPlanDefName(e.target.value)}
                  placeholder="e.g. Starter, Growth, Enterprise"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Plan Code (Unique ID)
                </label>
                <Input
                  value={planDefCode}
                  onChange={(e) => setPlanDefCode(e.target.value)}
                  placeholder="e.g. starter, pro, vip"
                  disabled={Boolean(editingPlanDef)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Price (BDT)
                </label>
                <Input
                  type="number"
                  value={planDefPriceBdt}
                  onChange={(e) => setPlanDefPriceBdt(Number(e.target.value))}
                  min={0}
                  step="any"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Billing Cycle
                </label>
                <select
                  value={planDefBillingCycle}
                  onChange={(e) => setPlanDefBillingCycle(e.target.value)}
                  className="w-full rounded-xl border border-border dark:border-border bg-white dark:bg-surface px-3 py-2 text-xs font-medium text-ink dark:text-ink"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input type="number" label="Monthly completed checkouts (999999 = unlimited)" min={1} value={planDefCredits} onChange={e => setPlanDefCredits(Number(e.target.value))} required />
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Device limit
                </label>
                <Input
                  type="number"
                  value={planDefDeviceLimit}
                  onChange={(e) => setPlanDefDeviceLimit(Number(e.target.value))}
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                  Method / gateway limit
                </label>
                <Input
                  type="number"
                  value={planDefMethodLimit}
                  onChange={(e) => setPlanDefMethodLimit(Number(e.target.value))}
                  min={0}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                Description
              </label>
              <textarea
                value={planDefDescription}
                onChange={(e) => setPlanDefDescription(e.target.value)}
                placeholder="Key marketing highlights, limits, and capabilities..."
                className="w-full rounded-xl border border-border dark:border-border bg-white dark:bg-surface px-3 py-2 text-xs font-normal text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-border-strong dark:focus:ring-border-strong min-h-[64px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink dark:text-ink mb-1">
                Features (one per line)
              </label>
              <textarea
                value={planDefFeatures}
                onChange={(e) => setPlanDefFeatures(e.target.value)}
                placeholder={"Unlimited brands\nPriority SMS matching\nCustom domain"}
                className="w-full rounded-xl border border-border dark:border-border bg-white dark:bg-surface px-3 py-2 text-xs font-normal text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-border-strong dark:focus:ring-border-strong min-h-[72px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink dark:text-ink">
                <input
                  type="checkbox"
                  checked={planDefIsFree}
                  onChange={(e) => setPlanDefIsFree(e.target.checked)}
                  className="rounded border-border text-ink focus:ring-0"
                />
                <span>Free plan</span>
              </label>

              {editingPlanDef && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Status:</span>
                  <select
                    value={planDefStatus}
                    onChange={(e) => setPlanDefStatus(e.target.value as any)}
                    className="rounded-lg border border-border dark:border-border bg-white dark:bg-surface px-2 py-1 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border dark:border-border">
              <Button type="button" variant="outline" onClick={() => setPlanDefModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingPlanDef}>
                {isSubmittingPlanDef ? "Saving..." : editingPlanDef ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
