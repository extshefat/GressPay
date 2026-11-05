"use client";
import { QR_COLORS } from "@/lib/design/tokens";

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { CopyField } from "@/components/ui/copy-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/formatters";
import {
  Smartphone,
  RefreshCw,
  Plus,
  Download,
  Trash2,
  Copy,
  RotateCw,
} from "lucide-react";
import Link from "next/link";

type DeviceRow = {
  deviceId: string;
  label: string;
  brandId?: string;
  brandName?: string;
  boundGatewayId?: string | null;
  boundGatewayAccount?: string | null;
  boundGatewayMethod?: string | null;
  boundGatewayName?: string | null;
  status: string;
  lastSeenAt?: string | null;
  online?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deviceAppKey?: string;
  deviceAppKeyMasked?: string;
  deviceAppKeyCopyable?: boolean;
};

type GatewayOption = {
  gatewayId: string;
  brandId?: string;
  methodCode: string;
  displayName: string;
  account?: string | null;
};

type BrandOption = { brandId: string; name: string };

/** Match backend CompanionController::ONLINE_WINDOW_SEC (10 minutes). */
const DEVICE_ONLINE_WINDOW_SEC = 600;

type SmsRow = {
  id: string;
  sender_key: string;
  amount: number;
  trx_id: string;
  number?: string;
  status: string;
  device_label?: string;
  created_at: string;
};

export default function CompanionDevicesPage() {
  const { success, error: toastError } = useToast();

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [activeBrandId, setActiveBrandId] = useState("");
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bindingDeviceId, setBindingDeviceId] = useState<string | null>(null);
  const [isLoadingSms, setIsLoadingSms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [revokeDevice, setRevokeDevice] = useState<DeviceRow | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [addDeviceStep, setAddDeviceStep] = useState<1 | 2>(1);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [generatedDeviceId, setGeneratedDeviceId] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [registeredBrandId, setRegisteredBrandId] = useState("");
  const [registeredBrandName, setRegisteredBrandName] = useState("");
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.listCompanionDevices();
      setDevices(
        (data.devices || []).filter((d) => (d.status || "active").toLowerCase() === "active")
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load companion devices.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadGateways = useCallback(async () => {
    try {
      const data = await api.listGateways();
      setGateways(
        (data.gateways || []).map((g) => ({
          gatewayId: g.gatewayId,
          methodCode: g.methodCode,
          displayName: g.displayName,
          account: g.account,
        }))
      );
    } catch {
      setGateways([]);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const data = await api.listBrands();
      const list = (data.brands || []).map((b) => ({ brandId: b.brandId, name: b.name }));
      setBrands(list);
      const fallback = data.activeBrandId || list[0]?.brandId || "";
      setActiveBrandId(data.activeBrandId || fallback);
      setSelectedBrandId((prev) => prev || fallback);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSmsLogs = useCallback(async () => {
    setIsLoadingSms(true);
    try {
      const data = await api.listMerchantSmsLogs();
      setSmsLogs(data.smsLogs || []);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingSms(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadBrands();
    loadGateways();
    loadSmsLogs();
  }, [loadDevices, loadBrands, loadGateways, loadSmsLogs]);

  const copyDeviceKey = async (device: DeviceRow) => {
    const full = device.deviceAppKey?.trim();
    if (!full) {
      if (
        window.confirm(
          "This device key cannot be re-copied yet (legacy row). Rotate the device key now? The Companion app must be updated with the new key."
        )
      ) {
        await rotateDeviceKey(device);
      } else {
        toastError("Use Rotate key in the row actions to issue a re-copyable secret.", "Key unavailable");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(full);
      success("Device API key copied — paste into the Companion app Setup screen.");
    } catch {
      toastError("Clipboard blocked — select and copy manually.");
    }
  };

  const rotateDeviceKey = async (device: DeviceRow) => {
    setRotatingId(device.deviceId);
    try {
      const res = await api.rotateCompanionDevice(device.deviceId);
      const key = res.deviceAppKey || res.token;
      await loadDevices();
      try {
        await navigator.clipboard.writeText(key);
        success("New device API key copied — paste into the Companion app.");
      } catch {
        success(res.note, "Device key rotated");
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not rotate device key.");
    } finally {
      setRotatingId(null);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) {
      toastError("Select a brand for this device.", "Brand required");
      return;
    }
    setIsRegistering(true);
    try {
      const res = await api.registerCompanionDevice(deviceLabel, selectedBrandId);
      const token = res.deviceAppKey || res.token;
      setGeneratedDeviceId(res.deviceId);
      setGeneratedToken(token);
      setRegisteredBrandId(res.brandId || selectedBrandId);
      setRegisteredBrandName(res.brandName || brands.find((b) => b.brandId === selectedBrandId)?.name || "");
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com";
      const siteBase = origin.replace(/\/$/, "").replace(/\/api\/v1\/?$/i, "");
      const payload = JSON.stringify({
        apiBaseUrl: siteBase,
        deviceId: res.deviceId,
        token,
        brandId: res.brandId || selectedBrandId,
      });
      const qr = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: QR_COLORS,
      });
      setPairingQr(qr);
      success("Device registered — copy the Device API key anytime from the table.", "Device created");
      await loadDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register companion device.";
      toastError(msg, "Registration Error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeDevice) return;
    const revokedId = revokeDevice.deviceId;
    setIsRevoking(true);
    try {
      await api.revokeCompanionDevice(revokedId);
      setDevices((prev) => prev.filter((d) => d.deviceId !== revokedId));
      success(`Device ${revokedId} revoked successfully.`, "Device Disconnected");
      setRevokeDevice(null);
      await loadDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke device.";
      toastError(msg, "Revocation Failed");
    } finally {
      setIsRevoking(false);
    }
  };

  const isOnline = (device: DeviceRow) => {
    if (typeof device.online === "boolean") return device.online;
    const lastSeen = device.lastSeenAt;
    if (!lastSeen) return false;
    const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000;
    return diff >= 0 && diff < DEVICE_ONLINE_WINDOW_SEC;
  };

  const apiBaseUrl = (
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com"
  )
    .replace(/\/$/, "")
    .replace(/\/api\/v1\/?$/i, "");

  const openAddModal = () => {
    setGeneratedDeviceId("");
    setGeneratedToken("");
    setPairingQr(null);
    setAddDeviceStep(1);
    setDeviceLabel("");
    setIsPairModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 dark:border-border sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-info dark:text-info" />
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">Manage Devices</h1>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Pair Android phones per brand for bKash/Nagad SMS matching. In the Companion app, paste only the{" "}
            <span className="font-mono font-semibold text-ink dark:text-ink">Device API key (gpdev_…)</span>
            . Do not paste your website key (<span className="font-mono">gp_live_…</span>) or Brand ID — the app
            links to your account automatically.
          </p>
          <p className="mt-1 text-[11px] text-warning dark:text-warning/90">
            Having trouble pairing? Download the APK below, add a device, then paste the key from this table.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDevices();
              loadSmsLogs();
            }}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <a
            href="/download/gresspay.apk"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-ink-solid px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-solid dark:border-white dark:bg-brand dark:text-on-brand dark:hover:bg-surface"
          >
            <Download className="h-3.5 w-3.5" />
            Direct Download
          </a>
          <Button variant="primary" size="sm" onClick={openAddModal} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Add New Device
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Device Notice">
          {errorMessage}
        </Alert>
      )}

      <Card className="overflow-hidden border-border bg-white shadow-xs dark:border-border dark:bg-canvas">
        <div className="flex items-center justify-between border-b border-border p-4 dark:border-border">
          <h3 className="text-sm font-bold text-ink dark:text-ink">Registered devices ({devices.length})</h3>
          <span className="text-[11px] font-mono text-muted">
            {devices.filter((d) => isOnline(d)).length} online
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-border dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-muted">Loading devices…</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="w-8 h-8 text-muted" />}
            title="No devices yet"
            description="Add a device, choose a brand, and copy the Device API key into the Companion app."
            action={
              <Button size="sm" variant="primary" onClick={openAddModal}>
                Add New Device
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-card text-[10px] font-mono uppercase tracking-wide text-muted dark:border-border dark:bg-surface">
                <tr>
                  <th className="px-4 py-3">Device Name</th>
                  <th className="px-4 py-3">Device API Key (For App)</th>
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3">Bound Wallet (SMS match)</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {devices.map((device) => {
                  const online = isOnline(device);
                  const lastTouch = device.updatedAt || device.lastSeenAt || device.createdAt;
                  return (
                    <tr key={device.deviceId} className="hover:bg-card/50 dark:hover:bg-ink-solid/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted" />
                          <div>
                            <div className="font-semibold text-ink dark:text-ink">
                              {device.label || "Android device"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono text-muted">{device.deviceId}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                                  online
                                    ? "border-success bg-success/10 text-success dark:border-success dark:bg-success/40 dark:text-success"
                                    : "border-border bg-surface text-muted dark:border-border dark:bg-surface-muted"
                                }`}
                              >
                                {online ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-[11px] tracking-wider text-ink dark:text-ink">
                            {device.deviceAppKeyMasked || "**********"}
                          </code>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-muted hover:bg-surface dark:border-border dark:text-ink dark:hover:bg-ink-solid"
                            aria-label={`Copy device API key for ${device.label}`}
                            title="Copy device key"
                            onClick={() => copyDeviceKey(device)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {device.brandName ? (
                          <span className="inline-flex rounded-lg border border-info bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info dark:border-info dark:bg-info/50 dark:text-info">
                            {device.brandName}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[200px]">
                        {device.brandId && activeBrandId && device.brandId !== activeBrandId ? (
                          <p className="text-[10px] text-muted">
                            Switch to this brand to bind a wallet
                            {device.boundGatewayAccount ? ` (current: ${device.boundGatewayAccount})` : ""}.
                          </p>
                        ) : (
                          <>
                            <select
                              className="w-full rounded-lg border border-border dark:border-border bg-white dark:bg-surface px-2 py-1.5 text-[11px] font-mono"
                              value={device.boundGatewayId || ""}
                              disabled={bindingDeviceId === device.deviceId}
                              onChange={async (e) => {
                                const next = e.target.value || null;
                                setBindingDeviceId(device.deviceId);
                                try {
                                  await api.bindCompanionDeviceGateway(device.deviceId, next);
                                  success(
                                    next
                                      ? "Device bound to wallet for SMS matching."
                                      : "Wallet binding cleared.",
                                    "Saved"
                                  );
                                  await loadDevices();
                                } catch (err: unknown) {
                                  toastError(
                                    err instanceof Error ? err.message : "Could not bind wallet.",
                                    "Bind failed"
                                  );
                                } finally {
                                  setBindingDeviceId(null);
                                }
                              }}
                            >
                              <option value="">No wallet bind</option>
                              {gateways.map((g) => (
                                <option key={g.gatewayId} value={g.gatewayId}>
                                  {g.displayName} · {g.account || g.methodCode}
                                </option>
                              ))}
                            </select>
                            {device.boundGatewayAccount && (
                              <p className="mt-1 text-[10px] text-muted">
                                Matches SMS to {device.boundGatewayAccount}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-muted">
                        {lastTouch ? formatDate(lastTouch) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-info hover:bg-info/10 dark:text-info dark:hover:bg-info/40"
                            aria-label={`Rotate device key for ${device.label}`}
                            title="Rotate device key"
                            disabled={rotatingId === device.deviceId}
                            onClick={() => rotateDeviceKey(device)}
                          >
                            <RotateCw
                              className={`h-4 w-4 ${rotatingId === device.deviceId ? "animate-spin" : ""}`}
                            />
                          </button>
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-danger hover:bg-danger/10 dark:text-danger dark:hover:bg-danger/30"
                            aria-label={`Remove device ${device.label}`}
                            title="Remove device"
                            onClick={() => setRevokeDevice(device)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="bg-white dark:bg-canvas border-border dark:border-border overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border dark:border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink dark:text-ink">Recent Synced SMS Feed</h3>
            <p className="text-xs text-muted">SMS captured for your active brand context.</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadSmsLogs}
            isLoading={isLoadingSms}
            leftIcon={<RefreshCw className="w-3 h-3" />}
          >
            Refresh
          </Button>
        </div>

        {smsLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted">
            No SMS messages ingested yet. Once customer payments are received on your paired phones, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted dark:text-muted">
              <thead className="bg-card dark:bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-ink dark:text-ink border-b border-border dark:border-border">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Transaction ID (TrxID)</th>
                  <th className="py-2.5 px-4">Sender Phone</th>
                  <th className="py-2.5 px-4">Device</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {smsLogs.map((sms) => {
                  const isMatched = sms.status === "used";
                  return (
                    <tr key={sms.id} className="hover:bg-card/50 dark:hover:bg-ink-solid/30">
                      <td className="py-3 px-4 font-mono text-[11px] text-muted">{formatDate(sms.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-ink-solid text-white dark:bg-brand dark:text-on-brand">
                          {sms.sender_key}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ink dark:text-ink">
                        ৳{Number(sms.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-ink dark:text-ink">{sms.trx_id}</td>
                      <td className="py-3 px-4 font-mono text-muted">{sms.number || "—"}</td>
                      <td className="py-3 px-4 text-muted font-mono text-[11px]">{sms.device_label || "Android Device"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                            isMatched
                              ? "bg-success/10 dark:bg-success/40 text-success dark:text-success border-success dark:border-success"
                              : "bg-warning/10 dark:bg-warning/40 text-warning dark:text-warning border-warning dark:border-warning"
                          }`}
                        >
                          {isMatched ? "MATCHED (PAID)" : "READY"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(revokeDevice)}
        onClose={() => setRevokeDevice(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Companion Node?"
        description={`Revoking device ${revokeDevice?.deviceId} will terminate its bearer token immediately. Incoming SMS payments from this device will no longer be processed.`}
        confirmLabel="Revoke Device Now"
        variant="danger"
        loading={isRevoking}
      />

      <Modal open={isPairModalOpen} onClose={() => setIsPairModalOpen(false)} title="Add New Device">
        {!generatedToken ? (
          addDeviceStep === 1 ? (
            <div className="space-y-4 text-xs">
              <p className="leading-relaxed text-muted">
                Select a brand to associate with the new device. SMS from this phone will match payments for that brand.
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink dark:text-ink">Select a brand…</label>
                <select
                  className="w-full rounded-lg border border-info/50 bg-white px-3 py-2.5 text-sm dark:border-info dark:bg-canvas"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a brand…
                  </option>
                  {brands.map((b) => (
                    <option key={b.brandId} value={b.brandId}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {brands.length === 0 && (
                  <p className="mt-2 text-[11px] text-warning dark:text-warning">
                    Create a brand first under{" "}
                    <Link href="/dashboard/brands" className="underline">
                      My Brands
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-3 dark:border-border">
                <Button type="button" variant="outline" onClick={() => setIsPairModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!selectedBrandId}
                  onClick={() => setAddDeviceStep(2)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted dark:border-border dark:bg-surface/50 dark:text-muted">
                Brand:{" "}
                <span className="font-semibold text-ink dark:text-ink">
                  {brands.find((b) => b.brandId === selectedBrandId)?.name || selectedBrandId}
                </span>
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink dark:text-ink">Device name</label>
                <Input
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. samsung, vivo, bKash SIM #1"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-3 dark:border-border">
                <Button type="button" variant="outline" onClick={() => setAddDeviceStep(1)}>
                  Back
                </Button>
                <Button type="submit" variant="primary" disabled={isRegistering || !selectedBrandId}>
                  {isRegistering ? "Creating…" : "Create device"}
                </Button>
              </div>
            </form>
          )
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-success/10 dark:bg-success/40 border border-success dark:border-success rounded-xl text-success dark:text-success space-y-1">
              <span className="font-bold">Device created</span>
              <p className="text-[11px]">
                Open Companion → Setup, paste the Device API key below, and tap Save &amp; verify. Server URL and account
                are filled in automatically — no Brand ID or gp_live_ key needed.
              </p>
            </div>

            {registeredBrandName ? (
              <p className="text-[11px] text-muted">
                Linked brand:{" "}
                <span className="font-semibold text-ink dark:text-ink">{registeredBrandName}</span>
              </p>
            ) : null}
            <CopyField label="Device API key (paste into Companion app)" value={generatedToken} />
            <details className="rounded-lg border border-border p-2 dark:border-border">
              <summary className="cursor-pointer text-[11px] font-medium text-muted dark:text-muted">
                Advanced (optional)
              </summary>
              <div className="mt-2 space-y-2">
                <CopyField label="API Base URL (site root, no /api/v1)" value={apiBaseUrl} />
                <CopyField label="Device ID" value={generatedDeviceId} />
              </div>
            </details>

            {pairingQr && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border dark:border-border bg-white dark:bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pairingQr} alt="Device pairing QR" className="w-44 h-44" />
                <p className="text-[11px] text-muted text-center">Scan in the Companion APK for instant pairing</p>
              </div>
            )}

            <a
              href="/download/gresspay.apk"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-ink-solid text-white dark:bg-brand dark:text-on-brand"
            >
              <Download className="w-3.5 h-3.5" />
              Download Companion APK
            </a>

            <div className="flex justify-end pt-2 border-t border-border dark:border-border">
              <Button size="sm" variant="primary" onClick={() => setIsPairModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
