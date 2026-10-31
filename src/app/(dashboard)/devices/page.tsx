"use client";

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
  status: string;
  lastSeenAt?: string | null;
  online?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deviceAppKey?: string;
  deviceAppKeyMasked?: string;
  deviceAppKeyCopyable?: boolean;
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
  const [smsLogs, setSmsLogs] = useState<SmsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadBrands = useCallback(async () => {
    try {
      const data = await api.listBrands();
      const list = (data.brands || []).map((b) => ({ brandId: b.brandId, name: b.name }));
      setBrands(list);
      const fallback = data.activeBrandId || list[0]?.brandId || "";
      setSelectedBrandId((prev) => prev || fallback);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSmsLogs = async () => {
    setIsLoadingSms(true);
    try {
      const data = await api.listMerchantSmsLogs();
      setSmsLogs(data.smsLogs || []);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingSms(false);
    }
  };

  useEffect(() => {
    loadDevices();
    loadBrands();
    loadSmsLogs();
  }, [loadDevices, loadBrands]);

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
        color: { dark: "#09090b", light: "#ffffff" },
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
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Manage Devices</h1>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
            Pair Android phones per brand for bKash/Nagad SMS matching. Copy the{" "}
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">Device API key (for app)</span>{" "}
            into the Companion Setup screen — not your brand website key.
          </p>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400/90">
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
            href="/download/gresspay-companion.apk"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
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

      <Card className="overflow-hidden border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-900">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Registered devices ({devices.length})</h3>
          <span className="text-[11px] font-mono text-zinc-500">
            {devices.filter((d) => isOnline(d)).length} online
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500">Loading devices…</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="w-8 h-8 text-zinc-400" />}
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
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-mono uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Device Name</th>
                  <th className="px-4 py-3">Device API Key (For App)</th>
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {devices.map((device) => {
                  const online = isOnline(device);
                  const lastTouch = device.updatedAt || device.lastSeenAt || device.createdAt;
                  return (
                    <tr key={device.deviceId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {device.label || "Android device"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono text-zinc-500">{device.deviceId}</span>
                              <span
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                                  online
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
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
                          <code className="font-mono text-[11px] tracking-wider text-zinc-700 dark:text-zinc-300">
                            {device.deviceAppKeyMasked || "**********"}
                          </code>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                          <span className="inline-flex rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
                            {device.brandName}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-500">
                        {lastTouch ? formatDate(lastTouch) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex rounded-lg p-2 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40"
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
                            className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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

      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Recent Synced SMS Feed</h3>
            <p className="text-xs text-zinc-500">SMS captured for your active brand context.</p>
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
          <div className="py-12 text-center text-xs text-zinc-500">
            No SMS messages ingested yet. Once customer payments are received on your paired phones, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[11px] font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
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
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {smsLogs.map((sms) => {
                  const isMatched = sms.status === "used";
                  return (
                    <tr key={sms.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">{formatDate(sms.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                          {sms.sender_key}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        ৳{Number(sms.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{sms.trx_id}</td>
                      <td className="py-3 px-4 font-mono text-zinc-500">{sms.number || "—"}</td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">{sms.device_label || "Android Device"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded border ${
                            isMatched
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
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
              <p className="leading-relaxed text-zinc-500">
                Select a brand to associate with the new device. SMS from this phone will match payments for that brand.
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Select a brand…</label>
                <select
                  className="w-full rounded-lg border border-sky-500/50 bg-white px-3 py-2.5 text-sm dark:border-sky-700 dark:bg-zinc-950"
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
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                    Create a brand first under{" "}
                    <Link href="/dashboard/brands" className="underline">
                      My Brands
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                Brand:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {brands.find((b) => b.brandId === selectedBrandId)?.name || selectedBrandId}
                </span>
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Device name</label>
                <Input
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. samsung, vivo, bKash SIM #1"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold">Device created</span>
              <p className="text-[11px]">
                Paste the Device API key into the Companion app. You can also copy it later from the devices table.
              </p>
            </div>

            <CopyField label="API Base URL (site root, no /api/v1)" value={apiBaseUrl} />
            {registeredBrandId ? (
              <CopyField label="Brand ID (X-GressPay-Brand)" value={registeredBrandId} />
            ) : null}
            {registeredBrandName ? (
              <p className="text-[11px] text-zinc-500">
                Brand: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{registeredBrandName}</span>
              </p>
            ) : null}
            <CopyField label="Device ID" value={generatedDeviceId} />
            <CopyField label="Device API key (for app)" value={generatedToken} />

            {pairingQr && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pairingQr} alt="Device pairing QR" className="w-44 h-44" />
                <p className="text-[11px] text-zinc-500 text-center">Scan in the Companion APK for instant pairing</p>
              </div>
            )}

            <a
              href="/download/gresspay-companion.apk"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
            >
              <Download className="w-3.5 h-3.5" />
              Download Companion APK
            </a>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
