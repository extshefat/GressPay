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
} from "lucide-react";

const METHOD_OPTIONS = [
  { code: "bkash", label: "bKash" },
  { code: "nagad", label: "Nagad" },
  { code: "usdt_trc20", label: "USDT TRC-20" },
  { code: "binance_pay", label: "Binance Pay" },
];

function readinessBadge(r: string): { label: string; variant: "emerald" | "amber" | "slate" | "rose" } {
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
    setFormInstructions("");
    setPreviewUrl(null);
    setShowForm(true);
  };

  const openEdit = async (g: MerchantGateway) => {
    setEditing(g);
    setFormMethod(g.methodCode);
    setFormName(g.displayName);
    setFormAccount(g.account || "");
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
          instructions: formInstructions,
        });
      } else {
        await api.createGateway({
          methodCode: formMethod,
          displayName: formName || METHOD_OPTIONS.find((m) => m.code === formMethod)?.label,
          account: formAccount,
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
        headers: intent.requiredHeaders,
        body: file,
      });
      if (!put.ok) throw new Error("Direct upload to R2 failed (" + put.status + ").");
      setUploadProgress("Confirming…");
      const done = await api.qrUploadComplete(editing.gatewayId, intent.objectKey);
      setEditing(done.gateway);
      const p = await api.previewGatewayQr(editing.gatewayId);
      setPreviewUrl(p.url);
      setUploadProgress(null);
      await load();
    } catch (err: unknown) {
      setUploadProgress(null);
      setErrorMessage(err instanceof Error ? err.message : "QR upload failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment gateways</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Add multiple bKash/Nagad/USDT accounts, upload QR images to private R2 storage, and enable each gateway
            independently. Scanning a QR never marks a payment as paid by itself.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add gateway
          </Button>
        </div>
      </div>

      {!r2Configured && (
        <Card className="p-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60">
          QR upload unavailable: set Cloudflare R2 platform secrets on the PHP API in Coolify. Destinations and rails still
          work without QR images.
        </Card>
      )}

      {errorMessage && (
        <Card className="p-4 border-rose-300/50 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-xs font-mono text-zinc-500">Loading gateways…</p>
      ) : gateways.length === 0 ? (
        <Card className="p-10 text-center text-sm text-zinc-500">
          No gateways yet. Add a bKash or Nagad receiving account to get started.
        </Card>
      ) : (
        <div className="space-y-2" role="list">
          {gateways.map((g, index) => {
            const rb = readinessBadge(g.readiness);
            return (
              <Card key={g.gatewayId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" role="listitem">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{g.displayName}</span>
                    <Badge variant="slate">{g.methodCode}</Badge>
                    <Badge variant={g.enabled ? "emerald" : "slate"}>{g.enabled ? "On" : "Off"}</Badge>
                    <Badge variant={rb.variant}>{rb.label}</Badge>
                  </div>
                  <p className="text-xs font-mono text-zinc-500 truncate">{g.account || "No destination"}</p>
                  <p className="text-[11px] text-zinc-400">
                    QR: {g.qrStatus}
                    {g.supportsQr ? "" : " (not applicable)"}
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
      )}

      {showForm && (
        <Card className="p-6 space-y-4 border-teal-200/50">
          <h2 className="font-semibold">{editing ? "Edit gateway" : "Add gateway"}</h2>
          <form onSubmit={saveForm} className="space-y-3">
            {!editing && (
              <label className="block text-sm space-y-1">
                <span className="text-zinc-600">Method</span>
                <select
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
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
            <Input label="Display name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            {formMethod !== "binance_pay" && (
              <Input
                label={formMethod === "usdt_trc20" ? "TRC-20 receive address" : "Receiving number"}
                value={formAccount}
                onChange={(e) => setFormAccount(e.target.value)}
                className="font-mono text-sm"
              />
            )}
            {formMethod === "binance_pay" && (
              <p className="text-xs text-zinc-500">
                Binance Pay credentials are configured in{" "}
                <Link href="/dashboard/settings" className="underline">
                  Settings
                </Link>
                .
              </p>
            )}
            <Input
              label="Checkout instructions (optional)"
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
            />
            {editing && editing.supportsQr && (
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> QR image
                </p>
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="QR preview" className="w-36 h-36 object-contain border rounded-lg bg-white" />
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
            <div className="flex gap-2">
              <Button type="submit" isLoading={busyId === "form"} leftIcon={<Save className="w-4 h-4" />}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <p className="text-[11px] text-zinc-400">
        Companion SMS matching is server-side (number + TxID + amount). Merchant QR keywords do not change the Android
        parser. See{" "}
        <Link href="/dashboard/devices" className="underline">
          Companion devices
        </Link>
        .
      </p>
    </div>
  );
}
