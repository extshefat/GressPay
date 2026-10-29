"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

type DeviceRow = {
  deviceId: string;
  label: string;
  status: string;
  lastSeenAt?: string | null;
  createdAt?: string;
};

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
  const [smsLogs, setSmsLogs] = useState<SmsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSms, setIsLoadingSms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revoke Dialog
  const [revokeDevice, setRevokeDevice] = useState<DeviceRow | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Pair Modal
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("bKash & Nagad Primary Phone");
  const [generatedDeviceId, setGeneratedDeviceId] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadDevices = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.listCompanionDevices();
      setDevices(data.devices || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load companion devices.");
    } finally {
      setIsLoading(false);
    }
  };

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
    loadSmsLogs();
  }, []);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const res = await api.registerCompanionDevice(deviceLabel);
      setGeneratedDeviceId(res.deviceId);
      setGeneratedToken(res.token);
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com";
      const payload = JSON.stringify({
        apiBaseUrl: `${origin.replace(/\/$/, "")}/api/v1`,
        deviceId: res.deviceId,
        token: res.token,
        brandId: api.getBrandId() || undefined,
      });
      const qr = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 1,
        color: { dark: "#09090b", light: "#ffffff" },
      });
      setPairingQr(qr);
      success("New companion device registered successfully. Copy token now.", "Pairing Token Created");
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
    setIsRevoking(true);
    try {
      await api.revokeCompanionDevice(revokeDevice.deviceId);
      success(`Device ${revokeDevice.deviceId} revoked successfully.`, "Device Disconnected");
      setRevokeDevice(null);
      await loadDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke device.";
      toastError(msg, "Revocation Failed");
    } finally {
      setIsRevoking(false);
    }
  };

  const isOnline = (lastSeen?: string | null) => {
    if (!lastSeen) return false;
    const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000;
    return diff < 600; // 10 minutes
  };

  const apiBaseUrl =
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com"
    ).replace(/\/$/, "") + "/api/v1";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Android Companion Devices
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              AUTOMATION NODES
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Pair Android phones to the <span className="font-semibold text-zinc-800 dark:text-zinc-200">active brand</span> so
            Personal / Agent / Payment MFS numbers verify via SMS. Switch brands under Brands, then register a device here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDevices();
              loadSmsLogs();
            }}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setGeneratedDeviceId("");
              setGeneratedToken("");
              setPairingQr(null);
              setIsPairModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Android Device
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Device Notice">
          {errorMessage}
        </Alert>
      )}

      {/* APK Banner */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              GressPay Companion APK
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
              v1.4.0 • Android 8.0 – 15
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
            Lightweight Android background service with battery-optimized WorkManager offline queuing and foreground DataSync service. Never misses an SMS payment.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/download/gresspay-companion.apk"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </a>
        </div>
      </div>

      {/* Device List */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Connected Companion Nodes ({devices.length})
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            {devices.filter((d) => isOnline(d.lastSeenAt)).length} Active Online
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500">Connecting to telemetry network…</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="w-8 h-8 text-zinc-400" />}
            title="No companion devices paired"
            description="Register and pair an Android phone to start receiving automated MFS payment confirmations."
            action={
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setGeneratedDeviceId("");
                  setGeneratedToken("");
                  setIsPairModalOpen(true);
                }}
              >
                Register First Device
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {devices.map((device) => {
              const online = isOnline(device.lastSeenAt);

              return (
                <div
                  key={device.deviceId}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5">
                      <Smartphone className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {device.label || "Android Settlement Node"}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            online
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                            }`}
                          />
                          {online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-zinc-500">
                        Device ID: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.deviceId}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                        <span>Last Heartbeat: {device.lastSeenAt ? formatDate(device.lastSeenAt) : "Never"}</span>
                        <span>•</span>
                        <span>Created: {device.createdAt ? formatDate(device.createdAt) : "Active"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRevokeDevice(device)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Live Synced SMS Feed Table */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Recent Synced SMS Feed
            </h3>
            <p className="text-xs text-zinc-500">
              Real-time payment notifications captured by your paired Android phones.
            </p>
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
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                        {formatDate(sms.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                          {sms.sender_key}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        ৳{Number(sms.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {sms.trx_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-500">
                        {sms.number || "—"}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                        {sms.device_label || "Android Device"}
                      </td>
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

      {/* Revoke Confirmation Dialog */}
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

      {/* Pair New Device Modal */}
      <Modal
        open={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        title="Register & Pair Android Companion"
      >
        {!generatedToken ? (
          <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Device Label / Phone Name
              </label>
              <Input
                value={deviceLabel}
                onChange={(e) => setDeviceLabel(e.target.value)}
                placeholder="e.g. bKash SIM Phone #1"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Name this phone to distinguish between multiple SIM cards or physical devices.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setIsPairModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isRegistering}>
                {isRegistering ? "Generating Key..." : "Create Pairing Credentials"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 space-y-1">
              <span className="font-bold">Pairing Token Generated:</span>
              <p className="text-[11px]">
                Copy this Device Token and paste it into the GressPay Companion APK settings on your phone. For security, this token is only shown once.
              </p>
            </div>

            <CopyField label="API Base URL" value={apiBaseUrl} />
            <CopyField label="Device ID" value={generatedDeviceId} />
            <CopyField label="Device Token (Copy Now)" value={generatedToken} />

            {pairingQr && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pairingQr} alt="Device pairing QR" className="w-44 h-44" />
                <p className="text-[11px] text-zinc-500 text-center">
                  Scan in the Companion APK for instant pairing
                </p>
              </div>
            )}

            <a
              href="/download/gresspay-companion.apk"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
            >
              <Download className="w-3.5 h-3.5" />
              Download Android Companion APK
            </a>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Setup Instructions:</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                <li>Install the GressPay Companion APK on your phone.</li>
                <li>Scan the QR or paste API Base URL + Device Token.</li>
                <li>Grant SMS &amp; Notification permissions.</li>
                <li>Disable battery optimization for 24/7 syncing.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button size="sm" variant="primary" onClick={() => setIsPairModalOpen(false)}>
                Done & Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
