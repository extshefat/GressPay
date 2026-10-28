"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { AdminPlatformPanel } from "@/features/dashboard/components/AdminPlatformPanel";
import {
  AdminMerchant,
  AdminPlan,
  AdminSubscription,
  AdminAuditLog,
  AdminStats,
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
  Archive,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [activeTab, setActiveTab] = useState<"overview" | "merchants" | "plans" | "subscriptions" | "audit">("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Credit Adjustment Modal
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchant | null>(null);
  const [creditDelta, setCreditDelta] = useState<number>(100);
  const [creditReason, setCreditReason] = useState<string>("Promotion bonus");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // Plan Create/Edit Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planPriceBdt, setPlanPriceBdt] = useState(0);
  const [planCredits, setPlanCredits] = useState(500);
  const [planDescription, setPlanDescription] = useState("");
  const [planIsFree, setPlanIsFree] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  // Assign Plan Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMerchant, setAssignMerchant] = useState<AdminMerchant | null>(null);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [s, m, p, sub, a] = await Promise.all([
        api.getAdminStats(),
        api.getAdminMerchants(),
        api.getAdminPlans(),
        api.getAdminSubscriptions(),
        api.getAdminAuditLogs(),
      ]);
      setStats(s);
      setMerchants(m.merchants || []);
      setPlans(p.plans || []);
      setSubscriptions(sub.subscriptions || []);
      setAuditLogs(a.auditLogs || []);
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

  // Credit Adjustment Handler
  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;
    setIsSubmittingCredit(true);
    setErrorMessage(null);
    try {
      await api.adjustAdminCredit(selectedMerchant.id, creditDelta, creditReason);
      setSuccessMessage(`Successfully updated credits for ${selectedMerchant.name}.`);
      setCreditModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to adjust credits.");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Plan Create/Edit Handler
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPlan(true);
    setErrorMessage(null);
    try {
      if (editingPlan) {
        await api.updateAdminPlan(editingPlan.id, {
          name: planName,
          priceBdt: planPriceBdt,
          creditAllowance: planCredits,
          description: planDescription,
          isFree: planIsFree,
        });
        setSuccessMessage(`Plan "${planName}" updated successfully.`);
      } else {
        await api.createAdminPlan({
          name: planName,
          code: planCode,
          priceBdt: planPriceBdt,
          creditAllowance: planCredits,
          description: planDescription,
          isFree: planIsFree,
          features: ["bkash_nagad_automation", "webhook_notifications", "api_access"],
        });
        setSuccessMessage(`Plan "${planName}" created successfully.`);
      }
      setPlanModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save plan.");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // Assign Plan Handler
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignMerchant || !assignPlanId) return;
    setIsSubmittingAssign(true);
    setErrorMessage(null);
    try {
      await api.assignAdminSubscription(assignMerchant.id, assignPlanId);
      setSuccessMessage(`Assigned plan to ${assignMerchant.name}.`);
      setAssignModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to assign plan.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Toggle Merchant Status
  const handleStatusToggle = async (merchant: AdminMerchant) => {
    const nextStatus = merchant.status === "active" ? "suspended" : "active";
    if (!confirm(`Are you sure you want to mark ${merchant.name} as ${nextStatus}?`)) return;
    try {
      await api.updateAdminMerchantStatus(merchant.id, nextStatus);
      setSuccessMessage(`Merchant ${merchant.name} is now ${nextStatus}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update merchant status.");
    }
  };

  // Toggle Plan Status (Archive/Activate)
  const handlePlanStatusToggle = async (plan: AdminPlan) => {
    const nextStatus = plan.status === "active" ? "archived" : "active";
    try {
      await api.updateAdminPlan(plan.id, { status: nextStatus });
      setSuccessMessage(`Plan "${plan.name}" is now ${nextStatus}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update plan status.");
    }
  };

  if (isForbidden) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Administrator Access Required
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Your current Google account is not configured in the server administrator allowlist (<code className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ADMIN_EMAIL</code>).
        </p>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-left text-xs font-mono text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          <div># Server-Enforced Configuration</div>
          <div className="mt-1 text-teal-600 dark:text-teal-400">ADMIN_EMAIL=ownerofext@gmail.com,measahin9@gmail.com,tradershefat8@gmail.com</div>
        </div>
        <div className="pt-2">
          <Button variant="outline" onClick={() => (window.location.href = "/overview")}>
            Return to Merchant Console
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPlatformPanel />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Admin Platform Console
            </h1>
            <Badge variant="emerald" className="gap-1 font-mono text-[10px]">
              <ShieldCheck className="w-3 h-3" /> SERVER ENFORCED
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage merchants, plans, subscription credits, and view auditable platform state transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={loadData}
          >
            Refresh
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

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { key: "overview", label: "Overview", icon: Activity },
          { key: "merchants", label: `Merchants (${merchants.length})`, icon: Users },
          { key: "plans", label: `Plans (${plans.length})`, icon: CreditCard },
          { key: "subscriptions", label: `Subscriptions (${subscriptions.length})`, icon: Layers },
          { key: "audit", label: `Audit Log (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Registered Merchants"
              value={stats.merchants.total.toString()}
              change={{ value: `${stats.merchants.active} Active`, trend: "up", label: "accounts" }}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Completed BDT Volume"
              value={formatCurrency(stats.transactions.volumeBdt, "BDT")}
              change={{ value: stats.transactions.completed, trend: "neutral", label: "verified" }}
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatCard
              title="Completed USDT Volume"
              value={`${stats.transactions.volumeUsdt.toFixed(2)} USDT`}
              change={{ value: "On-chain", trend: "up", label: "TRON verified" }}
              icon={<Coins className="w-4 h-4" />}
            />
            <StatCard
              title="Active Subscriptions"
              value={stats.subscriptions.activeSubscriptions.toString()}
              change={{ value: stats.subscriptions.activePlans, trend: "neutral", label: "plans" }}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Allowlisted Platform Administrators
              </h2>
              <p className="text-xs text-zinc-500">
                These email addresses possess server-authorized admin execution rights configured in the backend environment.
              </p>
              <div className="space-y-2">
                {stats.system.adminEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                  >
                    <span className="text-zinc-800 dark:text-zinc-200">{email}</span>
                    <Badge variant="emerald">Authorized</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Quick Admin Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanName("");
                    setPlanCode("");
                    setPlanPriceBdt(0);
                    setPlanCredits(500);
                    setPlanDescription("");
                    setPlanIsFree(false);
                    setPlanModalOpen(true);
                  }}
                >
                  Create New Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  leftIcon={<Users className="w-3.5 h-3.5" />}
                  onClick={() => setActiveTab("merchants")}
                >
                  Review Merchants
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  leftIcon={<History className="w-3.5 h-3.5" />}
                  onClick={() => setActiveTab("audit")}
                >
                  View Audit Logs
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MERCHANTS */}
      {activeTab === "merchants" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Registered Merchants & Wallet Accounts
            </h2>
            <div className="text-xs text-zinc-500 font-mono">
              Total: {merchants.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                  <th className="p-3">Merchant</th>
                  <th className="p-3">Store Brand</th>
                  <th className="p-3">Plan & Subscription</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Transactions</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {merchants.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{m.email}</div>
                    </td>
                    <td className="p-3 text-zinc-700 dark:text-zinc-300">
                      {m.brandName}
                    </td>
                    <td className="p-3">
                      {m.subscription ? (
                        <div>
                          <Badge variant="cyan" className="text-[10px]">
                            {m.subscription.planName}
                          </Badge>
                          <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                            {m.subscription.creditsUsed} used / {m.subscription.creditsRemaining} left
                          </div>
                        </div>
                      ) : (
                        <Badge variant="slate" className="text-[10px]">No Plan</Badge>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {m.credits}
                    </td>
                    <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {m.transactionsCount}
                    </td>
                    <td className="p-3">
                      <Badge variant={m.status === "active" ? "emerald" : "rose"}>
                        {m.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 text-zinc-500 font-mono text-[11px]">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedMerchant(m);
                          setCreditDelta(100);
                          setCreditReason("Admin allowance");
                          setCreditModalOpen(true);
                        }}
                      >
                        Adjust Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAssignMerchant(m);
                          setAssignPlanId(plans[0]?.id || "");
                          setAssignModalOpen(true);
                        }}
                      >
                        Assign Plan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={m.status === "active" ? "text-red-500 hover:text-red-600" : "text-emerald-500"}
                        onClick={() => handleStatusToggle(m)}
                      >
                        {m.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: PLANS */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Subscription Plans & Credit Packages
              </h2>
              <p className="text-xs text-zinc-500">
                Admin-controlled plans. Plan pricing and feature allowances are managed here and not exposed on public marketing cards.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingPlan(null);
                setPlanName("");
                setPlanCode("");
                setPlanPriceBdt(0);
                setPlanCredits(500);
                setPlanDescription("");
                setPlanIsFree(false);
                setPlanModalOpen(true);
              }}
            >
              Add New Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {p.isFree && <Badge variant="emerald">FREE</Badge>}
                      <Badge variant={p.status === "active" ? "cyan" : "slate"}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-2 font-mono">
                    {p.priceBdt === 0 ? "Free" : formatCurrency(p.priceBdt, "BDT")}
                    <span className="text-xs font-normal text-zinc-500 font-sans"> / {p.billingCycle}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                    {p.description || "No description provided."}
                  </p>

                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Verification Credits:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {p.creditAllowance} tx
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Internal Code:</span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400">{p.code}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlan(p);
                      setPlanName(p.name);
                      setPlanCode(p.code);
                      setPlanPriceBdt(p.priceBdt);
                      setPlanCredits(p.creditAllowance);
                      setPlanDescription(p.description);
                      setPlanIsFree(p.isFree);
                      setPlanModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePlanStatusToggle(p)}
                  >
                    {p.status === "active" ? "Archive" : "Activate"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTIONS */}
      {activeTab === "subscriptions" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Active & Historical Subscriptions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                  <th className="p-3">Merchant</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Credits Remaining</th>
                  <th className="p-3">Credits Used</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 font-sans">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{s.merchantName || s.merchantId}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{s.merchantEmail}</div>
                    </td>
                    <td className="p-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                      {s.planName}
                    </td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      {s.creditsRemaining}
                    </td>
                    <td className="p-3 text-zinc-500">
                      {s.creditsUsed}
                    </td>
                    <td className="p-3 font-sans">
                      <Badge variant={s.status === "active" ? "emerald" : "slate"}>
                        {s.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 text-zinc-500 text-[11px]">
                      {formatDate(s.startsAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === "audit" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Immutable Admin Action History
            </h2>
            <p className="text-xs text-zinc-500">
              Auditable log of plan creations, credit grants, status adjustments, and policy modifications.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 font-medium text-zinc-500">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor Email</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3 text-zinc-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="p-3 text-zinc-900 dark:text-zinc-100 font-semibold">
                      {log.actorEmail}
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-400">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="p-3 font-sans">
                      <Badge variant="cyan">{log.action}</Badge>
                    </td>
                    <td className="p-3 text-zinc-500 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: ADJUST CREDITS */}
      <Modal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        title={`Adjust Credits — ${selectedMerchant?.name}`}
      >
        <form onSubmit={handleCreditSubmit} className="space-y-4">
          <p className="text-xs text-zinc-500">
            Current balance: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedMerchant?.credits} credits</span>.
            Enter positive number to grant, negative to deduct.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Credit Delta
            </label>
            <Input
              type="number"
              value={creditDelta}
              onChange={(e) => setCreditDelta(parseInt(e.target.value) || 0)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Mandatory Reason / Note
            </label>
            <Input
              type="text"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              placeholder="e.g. Starter trial allowance, Support refund"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingCredit}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE / EDIT PLAN */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? `Edit Plan — ${editingPlan.name}` : "Create New Subscription Plan"}
      >
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Plan Name
              </label>
              <Input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Growth Pro"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Internal Code
              </label>
              <Input
                type="text"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. growth_pro"
                disabled={!!editingPlan}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Price (BDT)
              </label>
              <Input
                type="number"
                value={planPriceBdt}
                onChange={(e) => setPlanPriceBdt(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Credit Allowance (Tx)
              </label>
              <Input
                type="number"
                value={planCredits}
                onChange={(e) => setPlanCredits(parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <Input
              type="text"
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              placeholder="e.g. High-throughput companion matching with dedicated SLA"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="planIsFreeCheck"
              checked={planIsFree}
              onChange={(e) => setPlanIsFree(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="planIsFreeCheck" className="text-xs text-zinc-700 dark:text-zinc-300">
              Is Free Plan (no subscription fee required)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPlan}>
              {editingPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN PLAN */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Plan — ${assignMerchant?.name}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Select Subscription Plan
            </label>
            <select
              value={assignPlanId}
              onChange={(e) => setAssignPlanId(e.target.value)}
              className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-zinc-900 dark:text-zinc-100"
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceBdt === 0 ? "Free" : `৳${p.priceBdt}`} ({p.creditAllowance} credits)
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAssign}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
