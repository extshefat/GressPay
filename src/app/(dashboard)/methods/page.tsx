"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { MerchantGateway } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  ImageIcon,
  ShieldCheck,
  Smartphone,
  Layers,
  HelpCircle,
} from "lucide-react";

interface MethodMeta {
  code: string;
  label: string;
  category: "mfs" | "crypto";
  currency: string;
  accountLabel: string;
  placeholder: string;
}

const ALL_METHOD_OPTIONS: MethodMeta[] = [
  {
    code: "bkash",
    label: "bKash (MFS Automation)",
    category: "mfs",
    currency: "BDT",
    accountLabel: "bKash Wallet Number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "nagad",
    label: "Nagad (MFS Automation)",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Nagad Wallet Number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "rocket",
    label: "Rocket (DBBL Automation)",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Rocket Wallet Number (11 or 12 digits)",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "upay",
    label: "Upay (UCB Automation)",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Upay Wallet Number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "cellfin",
    label: "Cellfin (Islami Bank Smart Banking)",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Cellfin Account Number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "usdt_trc20",
    label: "USDT TRC-20 (TRON Blockchain)",
    category: "crypto",
    currency: "USDT",
    accountLabel: "TRON USDT Address (Base58 starting with T)",
    placeholder: "TLyqzVGLV1srkB7dToTAwdg296WC9gCsPQ",
  },
  {
    code: "binance_pay",
    label: "Binance Pay (Merchant API / QR)",
    category: "crypto",
    currency: "USDT",
    accountLabel: "Binance Pay ID / Merchant ID (optional notes)",
    placeholder: "e.g. 19283746",
  },
  {
    code: "bybit_pay",
    label: "Bybit Pay (Internal Transfer / UID)",
    category: "crypto",
    currency: "USDT",
    accountLabel: "Bybit UID / Account ID",
    placeholder: "e.g. 78291044",
  },
];

function readinessBadge(method: string, r: string): { label: string; variant: "emerald" | "amber" | "slate" | "rose" } {
  if (r === "disabled_by_admin") {
    return { label: "Disabled by Admin", variant: "slate" };
  }
  if (r === "needs_companion") {
    return { label: "Needs Companion APK", variant: "amber" };
  }
  if (r === "configured_disabled" || r === "disabled") {
    return { label: "Configured · Disabled", variant: "slate" };
  }
  if (r === "setup_incomplete") {
    return { label: "Setup Incomplete", variant: "amber" };
  }
  if (r === "live_ready") {
    return { label: "Live Ready", variant: "emerald" };
  }
  if (r === "ready_test") {
    return { label: "Ready (Test)", variant: "emerald" };
  }
  if (r === "qr_pending") {
    return { label: "QR Pending", variant: "amber" };
  }
  if (r === "needs_attention") {
    return { label: "Needs Attention", variant: "rose" };
  }
  return { label: r || "Configured", variant: "slate" };
}

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<MerchantGateway[]>([]);
  const [availableOptions, setAvailableOptions] = useState<MethodMeta[]>(ALL_METHOD_OPTIONS);
  const [r2Configured, setR2Configured] = useState(false);
  const [maxBytes, setMaxBytes] = useState(5242880);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MerchantGateway | null>(null);
  const [formMethod, setFormMethod] = useState("bkash");
  const [formName, setFormName] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formAccountType, setFormAccountType] = useState<"personal" | "agent" | "merchant">("personal");
  const [formInstructions, setFormInstructions] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [gwData, platformData] = await Promise.all([
        api.listGateways(),
        api.getPaymentMethods().catch(() => ({ methods: [] })),
      ]);
      setGateways(gwData.gateways || []);
      setR2Configured(Boolean(gwData.r2Configured));
      setMaxBytes(gwData.maxUploadBytes || 5242880);

      if (platformData.methods && platformData.methods.length > 0) {
        const enabledCodes = new Set(platformData.methods.map((m) => m.code));
        const filtered = ALL_METHOD_OPTIONS.filter((opt) => enabledCodes.has(opt.code));
        if (filtered.length > 0) {
          setAvailableOptions(filtered);
          if (!enabledCodes.has(formMethod)) {
            setFormMethod(filtered[0].code);
          }
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load gateways.");
    } finally {
      setIsLoading(false);
    }
  }, [formMethod]);

  useEffect(() => {
    load();
  }, [load]);

  const activeMeta = availableOptions.find((m) => m.code === formMethod) || availableOptions[0];

  const openCreate = () => {
    setEditing(null);
    const initialCode = availableOptions[0]?.code || "bkash";
    setFormMethod(initialCode);
    const meta = availableOptions.find((m) => m.code === initialCode);
    setFormName(meta?.label || "");
    setFormAccount("");
    setFormAccountType("personal");
    setFormInstructions("");
    setPreviewUrl(null);
    setShowForm(true);
  };

  const openEdit = async (g: MerchantGateway) => {
    setEditing(g);
    setFormMethod(g.methodCode);
    setFormName(g.displayName);
    setFormAccount(g.account || "");
    setFormAccountType((g.accountType as "personal" | "agent" | "merchant") || "personal");
    setFormInstructions((g.instructions as string) || "");
    setPreviewUrl(null);
    setShowForm(true);
    if (g.qrStatus === "ready") {
      try {
        const p = await api.previewGatewayQr(g.gatewayId);
        setPreviewUrl(p.url);
      } catch {
        /* ignore */
      }
    }
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("form");
    setErrorMessage(null);
    try {
      if (editing) {
        await api.updateGateway(editing.gatewayId, {
          displayName: formName,
          account: formAccount,
          accountType: formAccountType,
          instructions: formInstructions,
        });
      } else {
        await api.createGateway({
          methodCode: formMethod,
          displayName: formName || activeMeta?.label || formMethod,
          account: formAccount,
          accountType: formAccountType,
          instructions: formInstructions,
        });
      }
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (g: MerchantGateway) => {
    setBusyId(g.gatewayId);
    try {
      if (g.enabled) await api.disableGateway(g.gatewayId);
      else await api.enableGateway(g.gatewayId);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Toggle failed.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (g: MerchantGateway) => {
    if (!window.confirm(`Delete gateway “${g.displayName}”? This cannot be undone.`)) return;
    setBusyId(g.gatewayId);
    try {
      await api.deleteGateway(g.gatewayId);
      await load();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...gateways];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setGateways(next);
    try {
      await api.reorderGateways(next.map((g) => g.gatewayId));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Reorder failed.");
      await load();
    }
  };

  const onFile = async (file: File | null) => {
    if (!file || !editing) return;
    if (!r2Configured) {
      setErrorMessage("QR upload unavailable — platform storage is not configured.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMessage("Only PNG, JPEG, or WebP images are allowed.");
      return;
    }
    if (file.size > maxBytes) {
      setErrorMessage(`File exceeds ${maxBytes} bytes.`);
      return;
    }
    setUploadProgress("Requesting upload…");
    setBusyId(editing.gatewayId);
    try {
      const intent = await api.qrUploadIntent(editing.gatewayId, file.type, file.size);
      setUploadProgress("Uploading to storage…");
      const put = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload HTTP ${put.status}`);
      setUploadProgress("Finalizing QR…");
      await api.qrUploadComplete(editing.gatewayId, intent.objectKey);
      setUploadProgress(null);
      await load();
      if (editing) await openEdit(editing);
    } catch (err: unknown) {
      setUploadProgress(null);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyId(null);
    }
  };

  const mfsCodes = new Set(["bkash", "nagad", "rocket", "upay", "cellfin"]);
  const cryptoCodes = new Set(["usdt_trc20", "binance_pay", "bybit_pay"]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Payment Gateways &amp; Destinations
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              DIRECT SETTLEMENT
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Configure receiving wallet numbers and blockchain addresses. Only gateways enabled by platform admin are active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={openCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Payment Rail
          </Button>
        </div>
      </div>

      {/* Non-Custodial Architecture Strip */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            Non-Custodial Direct Settlement Architecture
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Funds bypass platform escrow and deposit directly into your personal or merchant wallet (bKash, Nagad, Rocket, Upay, Cellfin, or TRON USDT). The Android Companion APK matches incoming SMS messages instantly to settle orders in 1 second.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Card className="p-4 border-rose-300/50 flex gap-3 items-start bg-rose-50/50 dark:bg-rose-950/20">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-800 dark:text-rose-200">{errorMessage}</p>
        </Card>
      )}

      {/* Destination Form Modal/Drawer */}
      {showForm && (
        <Card className="p-6 space-y-4 border-zinc-900 dark:border-zinc-700 shadow-sm bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {editing ? `Edit Rail — ${editing.displayName}` : "Configure New Payment Destination"}
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              {editing ? editing.gatewayId : "New Configuration"}
            </span>
          </div>

          <form onSubmit={saveForm} className="space-y-4">
            {!editing && (
              <label className="block text-xs font-medium space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <span>Select Supported Payment Rail (Admin Enabled)</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  value={formMethod}
                  onChange={(e) => {
                    const nextCode = e.target.value;
                    setFormMethod(nextCode);
                    const meta = availableOptions.find((m) => m.code === nextCode);
                    if (meta) {
                      setFormName(meta.label);
                    }
                  }}
                >
                  {availableOptions.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label} ({m.currency})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <Input
              label="Display Name (shown to customers on checkout)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. bKash Personal 017..."
              required
            />

            {mfsCodes.has(formMethod) && (
              <label className="block text-xs font-medium space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <span>Account Type</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  value={formAccountType}
                  onChange={(e) => setFormAccountType(e.target.value as "personal" | "agent" | "merchant")}
                >
                  <option value="personal">Personal Account (Send Money)</option>
                  <option value="agent">Agent Account (Cash In)</option>
                  <option value="merchant">Merchant Account (Payment)</option>
                </select>
                <span className="block text-[11px] text-zinc-500">
                  Customers are instructed to use Send Money for personal wallets or Cash In for agent wallets.
                </span>
              </label>
            )}

            <Input
              label={activeMeta?.accountLabel || "Your Receiving Account / Number"}
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              placeholder={activeMeta?.placeholder || "01XXXXXXXXX"}
              className="font-mono text-xs"
              required={formMethod !== "binance_pay"}
            />

            <Input
              label="Custom Customer Instructions (optional)"
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              placeholder="e.g. Please use Send Money option and paste the 10-character TrxID below."
            />

            {editing && editing.supportsQr && (
              <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-900 pt-3">
                <p className="text-xs font-medium flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <ImageIcon className="w-4 h-4" /> Static Receiving QR Code (optional)
                </p>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="QR preview"
                    className="w-32 h-32 object-contain border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white p-2"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!r2Configured || busyId === editing.gatewayId}
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                  className="text-xs block w-full text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white dark:file:bg-white dark:file:text-zinc-950"
                />
                {uploadProgress && <p className="text-xs font-mono text-zinc-500">{uploadProgress}</p>}
                {editing.qrStatus === "ready" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api.deleteGatewayQr(editing.gatewayId);
                      setPreviewUrl(null);
                      await load();
                    }}
                  >
                    Remove QR
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <Button type="submit" variant="primary" isLoading={busyId === "form"} leftIcon={<Save className="w-4 h-4" />}>
                Save Destination
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Gateway Groups */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Loading payment gateways…</p>
        </div>
      ) : gateways.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-fit mx-auto">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              No payment destinations configured yet
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Add your bKash, Nagad, Rocket, Upay, Cellfin, or USDT TRC-20 wallet to start accepting automated payments.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Configure First Rail
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {[
            {
              title: "Mobile Banking (bKash, Nagad, Rocket, Upay, Cellfin)",
              hint: "Direct wallet settlement via paired Android Companion APK. Zero platform escrow.",
              items: gateways.filter((g) => mfsCodes.has(g.methodCode)),
              icon: <Smartphone className="w-4 h-4" />,
            },
            {
              title: "Cryptocurrency (USDT TRC-20, Binance Pay, Bybit Pay)",
              hint: "Non-custodial TRON blockchain on-chain verification, Binance Pay Merchant API, and Bybit Pay UID transfers.",
              items: gateways.filter((g) => cryptoCodes.has(g.methodCode)),
              icon: <Layers className="w-4 h-4" />,
            },
            {
              title: "Other Destinations",
              hint: "Legacy or custom configured destinations.",
              items: gateways.filter((g) => !mfsCodes.has(g.methodCode) && !cryptoCodes.has(g.methodCode)),
              icon: <HelpCircle className="w-4 h-4" />,
            },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    {group.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{group.title}</h2>
                    <p className="text-[11px] text-zinc-500">{group.hint}</p>
                  </div>
                </div>

                <div className="space-y-2.5" role="list">
                  {group.items.map((g) => {
                    const index = gateways.findIndex((row) => row.gatewayId === g.gatewayId);
                    const rb = readinessBadge(g.methodCode, g.readiness);

                    return (
                      <Card
                        key={g.gatewayId}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        role="listitem"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {g.displayName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {g.methodCode}
                            </span>
                            {g.accountType && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                                {g.accountType}
                              </span>
                            )}
                            <Badge variant={g.enabled ? "emerald" : "slate"} size="sm" dot>
                              {g.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Badge variant={rb.variant} size="sm">
                              {rb.label}
                            </Badge>
                          </div>

                          <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                            Receiving: <span className="font-bold text-zinc-900 dark:text-zinc-100">{g.account || "Not configured"}</span>
                            {g.instructions ? ` · ${g.instructions}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label="Move up"
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label="Move down"
                            onClick={() => move(index, 1)}
                            disabled={index === gateways.length - 1}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(g)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={busyId === g.gatewayId}
                            onClick={() => toggle(g)}
                          >
                            {g.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => remove(g)}
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Binance Pay Integration Guide */}
      <Card id="binance-pay" className="p-5 space-y-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Binance Pay Merchant API Integration</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Binance Pay requires encrypted Merchant API credentials. Configure your API Key, Secret, and Certificate Serial Number in Merchant Settings to enable automated order creation.
        </p>
        <Link href="/dashboard/settings#binance-pay" className="inline-block text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline pt-1">
          Configure Binance Pay API Credentials →
        </Link>
      </Card>
    </div>
  );
}
