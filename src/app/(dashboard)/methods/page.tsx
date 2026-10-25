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
} from "lucide-react";

const METHOD_OPTIONS = [
  { code: "bkash", label: "bKash (MFS Automation)" },
  { code: "nagad", label: "Nagad (MFS Automation)" },
  { code: "usdt_trc20", label: "USDT TRC-20 (TRON Blockchain)" },
];

function readinessBadge(method: string, r: string): { label: string; variant: "emerald" | "amber" | "slate" | "rose" } {
  if ((method === "bkash" || method === "nagad") && r === "live_ready") {
    return { label: "Number set · SMS required", variant: "amber" };
  }
  if (method === "usdt_trc20" && r === "live_ready") {
    return { label: "Address set · chain check", variant: "emerald" };
  }
  switch (r) {
    case "live_ready":
      return { label: "Live-ready", variant: "emerald" };
    case "ready_test":
      return { label: "Ready (test)", variant: "emerald" };
    case "qr_pending":
      return { label: "QR pending", variant: "amber" };
    case "setup_incomplete":
      return { label: "Setup incomplete", variant: "amber" };
    case "configured_disabled":
      return { label: "Configured · disabled", variant: "slate" };
    case "needs_attention":
      return { label: "Needs attention", variant: "rose" };
    default:
      return { label: r || "Unknown", variant: "slate" };
  }
}

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<MerchantGateway[]>([]);
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
      const data = await api.listGateways();
      setGateways(data.gateways || []);
      setR2Configured(Boolean(data.r2Configured));
      setMaxBytes(data.maxUploadBytes || 5242880);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load gateways.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormMethod("bkash");
    setFormName("");
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
    setFormAccountType((g.accountType as any) || "personal");
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
          displayName: formName || METHOD_OPTIONS.find((m) => m.code === formMethod)?.label,
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
      setErrorMessage("QR upload unavailable — platform R2 is not configured in Coolify.");
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Payment Gateways &amp; Destinations
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Bangladesh numbers and USDT addresses are separate from Binance Pay Merchant API credentials.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}>
            Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={openCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Destination
          </Button>
        </div>
      </div>

      {/* Onboarding Non-Custodial Banner */}
      <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300">
        <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            Direct-to-Wallet Principle
          </div>
          <p>
            You are responsible for entering and verifying your own receiving details below. When customers pay via hosted checkout or payment links, funds settle directly into your designated bKash, Nagad, or USDT TRC-20 wallet. GressPay never touches or pools your funds.
          </p>
        </div>
      </div>

      {!r2Configured && (
        <Card className="p-4 text-xs text-amber-800 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60">
          Cloudflare R2 storage is optional for custom static QR images. Numbers, addresses, and automated SMS matching operate normally without QR uploads.
        </Card>
      )}

      {errorMessage && (
        <Card className="p-4 border-rose-300/50 flex gap-3 items-start bg-rose-50/50 dark:bg-rose-950/20">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-800 dark:text-rose-200">{errorMessage}</p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-xs font-mono text-zinc-500">Loading gateways…</p>
      ) : gateways.length === 0 ? (
        <Card className="p-10 text-center text-sm text-zinc-500">
          No gateways configured yet. Click "Add Destination" above to set up your bKash, Nagad, or USDT wallet.
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Bangladesh MFS", hint: "bKash and Nagad complete on the live ledger only when a paired companion posts a matching SMS. Account type is a label, not a provider API.", items: gateways.filter((g) => g.methodCode === "bkash" || g.methodCode === "nagad") },
            { title: "USDT TRC-20", hint: "TRON network only. Confirm the address before you enable it. This is not a Binance Pay receipt.", items: gateways.filter((g) => g.methodCode === "usdt_trc20") },
            { title: "Other saved rows", hint: "Older catalog rows stay listed so they are not hidden. They are not part of the Bangladesh-first checkout.", items: gateways.filter((g) => !["bkash", "nagad", "usdt_trc20"].includes(g.methodCode)) },
          ].filter((group) => group.items.length > 0).map((group) => (
          <section key={group.title} className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{group.title}</h2>
              <p className="text-[11px] text-zinc-500">{group.hint}</p>
            </div>
            <div className="space-y-2" role="list">
          {group.items.map((g) => {
            const index = gateways.findIndex((row) => row.gatewayId === g.gatewayId);
            const rb = readinessBadge(g.methodCode, g.readiness);
            return (
              <Card key={g.gatewayId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-zinc-200 dark:border-zinc-800" role="listitem">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{g.displayName}</span>
                    <Badge variant="cyan" className="text-[10px]">{g.methodCode}</Badge>
                    {g.accountType && (
                      <Badge variant="slate" className="text-[10px] uppercase">{g.accountType}</Badge>
                    )}
                    <Badge variant={g.enabled ? "emerald" : "slate"} className="text-[10px]">
                      {g.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant={rb.variant} className="text-[10px]">{rb.label}</Badge>
                  </div>
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                    Destination: <span className="font-bold">{g.account || "Not configured"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                  <Button size="sm" variant="secondary" onClick={() => remove(g)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
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

      <Card id="binance-pay" className="p-5 space-y-2 border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Binance Pay Merchant API</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          This is not a Spot or trading API key, and it is not the same check as USDT TRC-20. Save the Merchant API key, secret, and certificate serial in settings. Values are write-only and encrypted for this brand. A saved gateway row without those credentials is not live-ready.
        </p>
        <Link href="/dashboard/settings#binance-pay" className="text-xs font-medium text-teal-700 underline dark:text-teal-300">
          Open Binance Pay credential form
        </Link>
      </Card>

      {showForm && (
        <Card className="p-6 space-y-4 border-teal-200/50 dark:border-teal-800/40">
          <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {editing ? `Edit Destination — ${editing.displayName}` : "Configure New Payment Destination"}
          </h2>
          <form onSubmit={saveForm} className="space-y-3">
            {!editing && (
              <label className="block text-xs font-medium space-y-1 text-zinc-700 dark:text-zinc-300">
                <span>Select Payment Rail</span>
                <select
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <Input
              label="Display Name (shown to customer)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. bKash Personal 017..."
              required
            />

            {formMethod !== "usdt_trc20" && (
              <label className="block text-xs font-medium space-y-1 text-zinc-700 dark:text-zinc-300">
                <span>Account Type</span>
                <select
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                  value={formAccountType}
                  onChange={(e) => setFormAccountType(e.target.value as any)}
                >
                  <option value="personal">Personal Account (Send Money)</option>
                  <option value="agent">Agent Account (Cash In)</option>
                  <option value="merchant">Merchant Account (Payment)</option>
                </select>
                <span className="block text-[11px] font-normal text-zinc-500">
                  This label is shown with your instructions. It does not connect an official bKash or Nagad API.
                </span>
              </label>
            )}

            <Input
              label={formMethod === "usdt_trc20" ? "TRON USDT Address (Base58 starting with T)" : "Your Wallet Phone Number"}
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              placeholder={formMethod === "usdt_trc20" ? "T followed by your TRON address" : "017XXXXXXXX"}
              className="font-mono text-xs"
              required
            />

            <Input
              label="Buyer Checkout Instructions (optional)"
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              placeholder="e.g. Use Send Money option and paste the 10-digit TrxID below."
            />

            {editing && editing.supportsQr && (
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <p className="text-xs font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> QR Code Image (optional)
                </p>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="QR preview" className="w-32 h-32 object-contain border rounded-lg bg-white" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!r2Configured || busyId === editing.gatewayId}
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
                {uploadProgress && <p className="text-xs text-zinc-500">{uploadProgress}</p>}
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={busyId === "form"} leftIcon={<Save className="w-4 h-4" />}>
                Save Destination
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <p className="text-[11px] text-zinc-400">
        Live bKash and Nagad checks need a paired phone. Open{" "}
        <Link href="/dashboard/devices" className="underline text-teal-600 dark:text-teal-400">
          Companion devices
        </Link>
        .
      </p>
    </div>
  );
}
