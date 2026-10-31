"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { gatewayLogoPath, gatewayShortLabel } from "@/lib/gateway-library";
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
    code: "bangla_qr",
    label: "Bangla QR",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Receiving account / wallet number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "bangla_qr_v2",
    label: "Bangla QR V2",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Receiving account / wallet number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "pathaopay",
    label: "Pathao Pay",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Pathao Pay number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "mcash",
    label: "mCash",
    category: "mfs",
    currency: "BDT",
    accountLabel: "mCash wallet number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "ok_wallet",
    label: "OK Wallet",
    category: "mfs",
    currency: "BDT",
    accountLabel: "OK Wallet number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "tap",
    label: "Tap",
    category: "mfs",
    currency: "BDT",
    accountLabel: "Tap wallet number",
    placeholder: "01XXXXXXXXX",
  },
  {
    code: "aamar_pay",
    label: "aamarPay",
    category: "mfs",
    currency: "BDT",
    accountLabel: "aamarPay account number",
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
    label: "Binance Pay (API / QR)",
    category: "crypto",
    currency: "USDT",
    accountLabel: "Binance Pay ID (optional notes)",
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
const MFS_CODES = new Set([
  "bkash",
  "nagad",
  "rocket",
  "upay",
  "cellfin",
  "bangla_qr",
  "bangla_qr_v2",
  "pathaopay",
  "mcash",
  "ok_wallet",
  "tap",
  "aamar_pay",
]);

const CRYPTO_CODES = new Set(["usdt_trc20", "binance_pay", "bybit_pay"]);

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

  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<"all" | "mfs" | "crypto" | "bank">("all");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MerchantGateway | null>(null);
  const [formMethod, setFormMethod] = useState("bkash");
  const [formName, setFormName] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formAccountType, setFormAccountType] = useState<"personal" | "agent" | "merchant" | "payment">("personal");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formApiSecret, setFormApiSecret] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formRateMode, setFormRateMode] = useState<"auto" | "custom">("auto");
  const [formCustomRate, setFormCustomRate] = useState("");
  const [formBinanceMode, setFormBinanceMode] = useState<"uid" | "merchant_api">("uid");
  const [formAccountName, setFormAccountName] = useState("");
  const [formUsdtOptional, setFormUsdtOptional] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "mfs" | "crypto">("all");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formMinAmount, setFormMinAmount] = useState("10");
  const [formMaxAmount, setFormMaxAmount] = useState("100000");
  const [formCurrency, setFormCurrency] = useState("BDT");
  const [formGatewayFee, setFormGatewayFee] = useState("0");
  const [formGatewayFeeType, setFormGatewayFeeType] = useState<"percentage" | "fixed">("percentage");
  const [formGatewayCategory, setFormGatewayCategory] = useState("mobile_banking");
  const [formExchangeRate, setFormExchangeRate] = useState("");
  const [formBinanceApiKey, setFormBinanceApiKey] = useState("");
  const [formBinanceApiSecret, setFormBinanceApiSecret] = useState("");

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

  const resetMerchantCreds = () => {
    setFormUsername("");
    setFormPassword("");
    setFormApiKey("");
    setFormApiSecret("");
  };

  const openCreate = () => {
    setEditing(null);
    setLibraryQuery("");
    setLibraryFilter("all");
    setShowLibrary(true);
  };

  const pickFromLibrary = (code: string) => {
    const meta = availableOptions.find((m) => m.code === code);
    setFormMethod(code);
    setFormName(meta?.label || code);
    setFormAccount("");
    setFormAccountType("personal");
    resetMerchantCreds();
    setFormInstructions("");
    setFormRateMode("auto");
    setFormCustomRate("");
    setFormBinanceMode("uid");
    setFormAccountName("");
    setFormUsdtOptional("");
    setFormMinAmount("10");
    setFormMaxAmount("100000");
    setFormCurrency(meta?.currency || "BDT");
    setFormGatewayFee("0");
    setFormGatewayFeeType("percentage");
    setFormGatewayCategory("mobile_banking");
    setFormExchangeRate("");
    setFormBinanceApiKey("");
    setFormBinanceApiSecret("");
    setPreviewUrl(null);
    setShowLibrary(false);
    setShowForm(true);
  };

  const openEdit = async (g: MerchantGateway) => {
    setEditing(g);
    setFormMethod(g.methodCode);
    setFormName(g.displayName);
    setFormAccount(g.account || "");
    setFormAccountType(
      (g.accountType as "personal" | "agent" | "merchant" | "payment") || "personal"
    );
    resetMerchantCreds();
    setFormInstructions((g.instructions as string) || "");
    setFormRateMode("auto");
    setFormCustomRate("");
    setFormBinanceMode(g.methodCode === "binance_pay" ? "merchant_api" : "uid");
    setFormAccountName("");
    setFormUsdtOptional("");
    setFormMinAmount(g.minAmount || "10");
    setFormMaxAmount(g.maxAmount || "100000");
    setFormCurrency(g.currency || "BDT");
    setFormGatewayFee(g.gatewayFee || "0");
    setFormGatewayFeeType((g.gatewayFeeType as "percentage" | "fixed") || "percentage");
    setFormGatewayCategory(g.gatewayCategory || "mobile_banking");
    setFormExchangeRate(g.exchangeRate || "");
    setFormBinanceApiKey("");
    setFormBinanceApiSecret("");
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

  const validateForm = (): string | null => {
    if (MFS_CODES.has(formMethod)) {
      const digits = formAccount.replace(/\D/g, "");
      if (formMethod === "rocket") {
        if (digits.length < 11 || digits.length > 12) return "Rocket wallet must be 11–12 digits.";
      } else if (!/^01\d{9}$/.test(digits)) {
        return "Bangladesh MFS wallet must be an 11-digit number starting with 01.";
      }
      if (formAccountType === "merchant") {
        if (!formApiKey.trim() || !formApiSecret.trim()) {
          return "Business (API) account type requires API key and API secret (or password).";
        }
      }
    }
    if (formMethod === "usdt_trc20") {
      if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(formAccount.trim())) {
        return "USDT TRC-20 address must be a valid Base58 address starting with T (34 chars).";
      }
      if (formRateMode === "custom" && !(Number(formCustomRate) > 0)) {
        return "Enter a valid custom BDT per USDT rate.";
      }
    }
    if (formMethod === "binance_pay" && formBinanceMode === "uid" && formAccount.trim().length < 4) {
      return "Enter a Binance Pay UID.";
    }
    if (formMethod === "bybit_pay" && formAccount.trim().length < 4) {
      return "Enter a Bybit UID.";
    }
    return null;
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setBusyId("form");
    setErrorMessage(null);
    try {
      const payload: Record<string, unknown> = {
        displayName: formName || activeMeta?.label || formMethod,
        account: formAccount,
        accountType: MFS_CODES.has(formMethod) ? formAccountType : "personal",
        instructions: formInstructions,
        minAmount: formMinAmount,
        maxAmount: formMaxAmount,
        currency: formCurrency,
        gatewayFee: formGatewayFee,
        gatewayFeeType: formGatewayFeeType,
        gatewayCategory: formGatewayCategory,
      };
      if (MFS_CODES.has(formMethod) && formAccountType === "merchant") {
        if (formUsername.trim()) payload.username = formUsername.trim();
        if (formPassword.trim()) payload.password = formPassword.trim();
        if (formApiKey.trim()) payload.api_key = formApiKey.trim();
        if (formApiSecret.trim()) payload.api_secret = formApiSecret.trim();
      }
      if (formMethod === "usdt_trc20") {
        payload.exchangeRateMode = formRateMode;
        if (formRateMode === "custom") payload.custom_rate_bdt = Number(formCustomRate);
      }
      if (formMethod === "binance_pay") {
        payload.mode = formBinanceMode === "merchant_api" ? "merchant" : "personal";
        payload.account_name = formAccountName;
        payload.binance_uid = formAccount;
        if (formMinAmount) payload.minAmount = formMinAmount;
        if (formMaxAmount) payload.maxAmount = formMaxAmount;
        if (formExchangeRate.trim()) payload.exchangeRate = Number(formExchangeRate);
        if (formBinanceApiKey.trim()) payload.api_key = formBinanceApiKey.trim();
        if (formBinanceApiSecret.trim()) payload.api_secret = formBinanceApiSecret.trim();
      }
      if (formMethod === "bybit_pay") {
        payload.bybit_uid = formAccount;
        payload.account_name = formAccountName;
        if (formUsdtOptional.trim()) payload.wallet_address = formUsdtOptional.trim();
      }

      if (editing) {
        await api.updateGateway(editing.gatewayId, payload);
      } else {
        await api.createGateway({
          methodCode: formMethod,
          ...payload,
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

  const filteredGateways = gateways.filter((g) => {
    if (categoryFilter === "mfs") return MFS_CODES.has(g.methodCode);
    if (categoryFilter === "crypto") return CRYPTO_CODES.has(g.methodCode);
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              View Gateways
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              DIRECT SETTLEMENT
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Showing wallets for the selected brand. Enable, reorder, and edit credentials per channel.
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
            Add Gateways
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1">
        {(
          [
            { id: "all", label: "All Gateways" },
            { id: "mfs", label: "Bangladesh MFS" },
            { id: "crypto", label: "Global Crypto" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategoryFilter(tab.id)}
            className={`flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              categoryFilter === tab.id
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Non-Custodial Architecture Strip */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            Non-Custodial Direct Settlement Architecture
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Funds bypass platform escrow and deposit directly into your personal or business wallet (bKash, Nagad, Rocket, Upay, Cellfin, or TRON USDT). The Android Companion APK matches incoming SMS messages instantly to settle orders in 1 second.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Card className="p-4 border-rose-300/50 flex gap-3 items-start bg-rose-50/50 dark:bg-rose-950/20">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-800 dark:text-rose-200">{errorMessage}</p>
        </Card>
      )}

      {showLibrary && (
        <Card className="space-y-4 border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-400">Gateway library</p>
              <h2 className="text-lg font-bold text-white">Choose a payment channel</h2>
              <p className="text-xs text-zinc-400">Logo-forward catalog — then configure account type and limits.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowLibrary(false)} className="border-zinc-700 text-zinc-200">
              Cancel
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              label="Search"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search by gateway name…"
              className="border-zinc-800 bg-zinc-900 text-white"
            />
            <div className="flex flex-wrap gap-1 self-end rounded-xl border border-zinc-800 bg-zinc-900 p-1">
              {(["all", "mfs", "crypto", "bank"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLibraryFilter(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    libraryFilter === id
                      ? "bg-sky-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {id === "all" ? "All" : id === "mfs" ? "Mobile" : id === "crypto" ? "International" : "Bank"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {availableOptions
              .filter((m) => {
                if (libraryFilter === "bank") return false;
                if (libraryFilter === "mfs" && m.category !== "mfs") return false;
                if (libraryFilter === "crypto" && m.category !== "crypto") return false;
                const q = libraryQuery.trim().toLowerCase();
                if (q) {
                  const short = gatewayShortLabel(m.code, m.label).toLowerCase();
                  if (!short.includes(q) && !m.label.toLowerCase().includes(q)) return false;
                }
                return true;
              })
              .map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => pickFromLibrary(m.code)}
                  className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-center transition hover:border-sky-500/60 hover:bg-zinc-900"
                >
                  <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-zinc-700/80">
                    <Image
                      src={gatewayLogoPath(m.code)}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <div className="text-sm font-semibold text-white">{gatewayShortLabel(m.code, m.label)}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase text-zinc-500">
                    {m.category === "crypto" ? "International" : "Mobile"} · {m.currency}
                  </div>
                </button>
              ))}
          </div>
          {libraryFilter === "bank" && (
            <p className="text-center text-xs text-zinc-500">Bank rails are not in this release. Use Mobile or International channels.</p>
          )}
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

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Minimum amount"
                value={formMinAmount}
                onChange={(e) => setFormMinAmount(e.target.value)}
                className="font-mono text-xs"
              />
              <Input
                label="Maximum amount"
                value={formMaxAmount}
                onChange={(e) => setFormMaxAmount(e.target.value)}
                className="font-mono text-xs"
              />
              <Input
                label="Payment currency"
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                className="font-mono text-xs"
              />
              <Input
                label="Gateway fee"
                value={formGatewayFee}
                onChange={(e) => setFormGatewayFee(e.target.value)}
                className="font-mono text-xs"
              />
              <label className="block space-y-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <span>Fee type</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  value={formGatewayFeeType}
                  onChange={(e) => setFormGatewayFeeType(e.target.value as "percentage" | "fixed")}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <span>Gateway category</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  value={formGatewayCategory}
                  onChange={(e) => setFormGatewayCategory(e.target.value)}
                >
                  <option value="mobile_banking">Mobile Banking</option>
                  <option value="bangla_qr">Bangla QR</option>
                  <option value="international">International / Crypto</option>
                </select>
              </label>
            </div>

            {MFS_CODES.has(formMethod) && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Account Type</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { id: "personal", label: "Personal", hint: "SMS verify · Send Money / Cash In" },
                      { id: "agent", label: "Agent", hint: "SMS verify · Cash Out only" },
                      { id: "payment", label: "Payment", hint: "SMS verify · Payment only" },
                      { id: "merchant", label: "Business (API)", hint: "API key + secret" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormAccountType(t.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        formAccountType === t.id
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className={`mt-0.5 text-[10px] ${formAccountType === t.id ? "opacity-80" : "text-zinc-500"}`}>
                        {t.hint}
                      </div>
                    </button>
                  ))}
                </div>
                {formAccountType === "merchant" && (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-2">
                    <Input
                      label={`${formMethod} username (optional)`}
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      autoComplete="off"
                    />
                    <Input
                      label={`${formMethod} password`}
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <Input
                      label="API key"
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                      className="font-mono text-xs"
                      autoComplete="off"
                    />
                    <Input
                      label="API secret"
                      type="password"
                      value={formApiSecret}
                      onChange={(e) => setFormApiSecret(e.target.value)}
                      className="font-mono text-xs"
                      autoComplete="new-password"
                    />
                    <p className="col-span-full text-[11px] text-zinc-500">
                      Secrets are encrypted at rest and never shown again after save. Personal / Agent / Payment
                      numbers verify via Companion SMS on a paired device for this brand.
                    </p>
                  </div>
                )}
                {formAccountType !== "merchant" && (
                  <p className="text-[11px] text-zinc-500">
                    This number is verified by Companion SMS match. Pair an Android device under{" "}
                    <Link href="/dashboard/devices" className="font-semibold underline">
                      Companion devices
                    </Link>{" "}
                    for this brand.
                  </p>
                )}
              </div>
            )}

            {formMethod === "binance_pay" && (
              <label className="block text-xs font-medium space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <span>Integration Mode</span>
                <select
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium"
                  value={formBinanceMode}
                  onChange={(e) => setFormBinanceMode(e.target.value as "uid" | "merchant_api")}
                >
                  <option value="uid">Personal Binance UID</option>
                  <option value="merchant_api">Binance Pay API</option>
                </select>
              </label>
            )}

            <Input
              label={
                formMethod === "usdt_trc20"
                  ? "TRON (TRC20) Receiving Wallet Address"
                  : formMethod === "binance_pay"
                  ? formBinanceMode === "uid"
                    ? "Binance Pay UID"
                    : "Binance Pay API key note / Pay ID"
                  : formMethod === "bybit_pay"
                  ? "Bybit UID"
                  : activeMeta?.accountLabel || "Receiving Account / Number"
              }
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              placeholder={activeMeta?.placeholder || "01XXXXXXXXX"}
              className="font-mono text-xs"
              required={!(formMethod === "binance_pay" && formBinanceMode === "merchant_api")}
            />

            {(formMethod === "binance_pay" || formMethod === "bybit_pay") && (
              <Input
                label="Account Name"
                value={formAccountName}
                onChange={(e) => setFormAccountName(e.target.value)}
                placeholder="Display name for checkout"
              />
            )}

            {formMethod === "bybit_pay" && (
              <Input
                label="Optional USDT TRC20 Address"
                value={formUsdtOptional}
                onChange={(e) => setFormUsdtOptional(e.target.value)}
                placeholder="T..."
                className="font-mono text-xs"
              />
            )}

            {formMethod === "usdt_trc20" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-medium space-y-1.5 text-zinc-700 dark:text-zinc-300">
                  <span>Exchange Rate Mode</span>
                  <select
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium"
                    value={formRateMode}
                    onChange={(e) => setFormRateMode(e.target.value as "auto" | "custom")}
                  >
                    <option value="auto">Auto Live Rate</option>
                    <option value="custom">Custom BDT per USDT Rate</option>
                  </select>
                </label>
                {formRateMode === "custom" && (
                  <Input
                    label="Custom BDT / USDT"
                    value={formCustomRate}
                    onChange={(e) => setFormCustomRate(e.target.value)}
                    placeholder="e.g. 122.50"
                    className="font-mono text-xs"
                  />
                )}
              </div>
            )}

            {formMethod === "binance_pay" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Exchange rate (1 USD = BDT)"
                  value={formExchangeRate}
                  onChange={(e) => setFormExchangeRate(e.target.value)}
                  placeholder="e.g. 130"
                  className="font-mono text-xs"
                />
                {formBinanceMode === "merchant_api" && (
                  <>
                    <Input
                      label="API key"
                      value={formBinanceApiKey}
                      onChange={(e) => setFormBinanceApiKey(e.target.value)}
                      className="font-mono text-xs"
                      autoComplete="off"
                    />
                    <Input
                      label="API secret"
                      type="password"
                      value={formBinanceApiSecret}
                      onChange={(e) => setFormBinanceApiSecret(e.target.value)}
                      className="font-mono text-xs"
                      autoComplete="new-password"
                    />
                  </>
                )}
              </div>
            )}

            {formMethod === "binance_pay" && formBinanceMode === "merchant_api" && (
              <p className="text-[11px] text-zinc-500 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                You can also store Binance Pay credentials under{" "}
                <Link href="/dashboard/settings#binance-pay" className="underline font-semibold text-zinc-900 dark:text-zinc-100">
                  Settings → Binance Pay
                </Link>
                . Keys entered here are sealed per brand and never shown again.
              </p>
            )}

            <Input
              label="Custom Checkout Instruction Note (optional)"
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              placeholder="e.g. Please use Send Money and paste the TrxID below."
            />

            {editing && MFS_CODES.has(formMethod) && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">Companion readiness</span>
                <Badge variant={editing.readiness === "needs_companion" ? "amber" : "emerald"} size="sm" dot>
                  {editing.readiness === "needs_companion" ? "No Active Device" : "Connected to Companion APK"}
                </Badge>
              </div>
            )}

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
      ) : filteredGateways.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 w-fit mx-auto">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              No payment destinations in this category
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Add your bKash, Nagad, Rocket, Upay, Cellfin, or crypto wallets to start accepting automated payments.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Configure First Rail
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Gateway</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Credentials</th>
                  <th className="px-3 py-2">Limits</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGateways.map((g) => {
                  const index = gateways.findIndex((row) => row.gatewayId === g.gatewayId);
                  const credParts = [
                    g.account ? `Account: ${g.account}` : null,
                    g.qrStatus === "ready" ? "QR: uploaded" : null,
                  ].filter(Boolean);
                  return (
                    <tr key={g.gatewayId} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100">{g.displayName}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">
                        {MFS_CODES.has(g.methodCode) ? "mobile_banking" : CRYPTO_CODES.has(g.methodCode) ? "international" : "other"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                          {g.accountType || "personal"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500">manual</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
                        {credParts.join(" | ") || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                        Min: {g.minAmount ?? "—"} | Max: {g.maxAmount ?? "—"}
                        <br />
                        Fee: {g.gatewayFee ?? "0"} ({g.gatewayFeeType === "fixed" ? "fixed" : "%"})
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={g.enabled}
                          onClick={() => toggle(g)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            g.enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              g.enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                          <span className="sr-only">{g.enabled ? "ON" : "OFF"}</span>
                        </button>
                        <span className="ml-2 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                          {g.enabled ? "ON" : "OFF"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" aria-label="Up" onClick={() => move(index, -1)} disabled={index === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="secondary" aria-label="Down" onClick={() => move(index, 1)} disabled={index === gateways.length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(g)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => remove(g)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {[
            {
              title: "Mobile Banking (bKash, Nagad, Rocket, Upay, Cellfin)",
              hint: "Direct wallet settlement via paired Android Companion APK. Zero platform escrow.",
              items: filteredGateways.filter((g) => MFS_CODES.has(g.methodCode)),
              icon: <Smartphone className="w-4 h-4" />,
            },
            {
              title: "Cryptocurrency (USDT TRC-20, Binance Pay, Bybit Pay)",
              hint: "Non-custodial TRON blockchain on-chain verification, Binance Pay API, and Bybit Pay UID transfers.",
              items: filteredGateways.filter((g) => CRYPTO_CODES.has(g.methodCode)),
              icon: <Layers className="w-4 h-4" />,
            },
            {
              title: "Other Destinations",
              hint: "Legacy or custom configured destinations.",
              items: filteredGateways.filter((g) => !MFS_CODES.has(g.methodCode) && !CRYPTO_CODES.has(g.methodCode)),
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
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Binance Pay API integration</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Binance Pay requires encrypted API credentials. Configure your API Key, Secret, and Certificate Serial Number in Account settings to enable automated order creation.
        </p>
        <Link href="/dashboard/settings#binance-pay" className="inline-block text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline pt-1">
          Configure Binance Pay API Credentials →
        </Link>
      </Card>
    </div>
  );
}
