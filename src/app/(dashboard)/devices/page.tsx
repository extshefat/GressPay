"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { CopyField } from "@/components/ui/copy-field";
import { useToast } from "@/components/ui/toast";
import {
  Smartphone,
  RefreshCw,
  Plus,
  Download,
  Wifi,
  Battery,
  ShieldAlert,
  Trash2,
  CheckCircle2,
} from "lucide-react";

type DeviceRow = {
  deviceId: string;
  label: string;
  status: string;
  lastSeenAt?: string | null;
  createdAt?: string;
};

export default function CompanionDevicesPage() {
  const { success, error: toastError } = useToast();

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revoke Dialog
  const [revokeDevice, setRevokeDevice] = useState<DeviceRow | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Pair Modal
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [pairToken, setPairToken] = useState("");

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

  useEffect(() => {
    loadDevices();
  }, []);

  const handleOpenPairModal = async () => {
    try {
      const creds = await api.getApiCredentials();
      setPairToken(creds.livePublicKey || "gp_live_pair_token_example");
      setIsPairModalOpen(true);
    } catch {
      setPairToken("gp_live_device_token");
      setIsPairModalOpen(true);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Companion Devices
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Android phones running the GressPay Companion APK to automate bKash & Nagad SMS matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDevices}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenPairModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Pair New Device
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Device Error">
          {errorMessage}
        </Alert>
      )}

      {/* Overview guide banner */}
      <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/50 dark:border-teal-900/60 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            How SMS Automation Works
          </span>
          <p className="text-zinc-600 dark:text-zinc-400">
            Install GressPay Companion on your Android phone, enter your merchant pairing key, and enable background service. Receipts are verified in &lt;3s.
          </p>
        </div>
        <a
          href="/help#companion-setup"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[#077C74] dark:text-[#1BD1C0] font-medium hover:underline flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Companion APK</span>
        </a>
      </div>

      {/* Device List */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500">Checking device nodes…</p>
          </div>
        ) : devices.length === 0 ? (
          <EmptyState
            icon={<Smartphone className="w-6 h-6 text-zinc-400" />}
            title="No companion devices paired"
            description="Pair an Android smartphone to enable automated bKash and Nagad payment confirmation."
            action={
              <Button size="sm" variant="primary" onClick={handleOpenPairModal}>
                Pair Android Phone
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {devices.map((device) => {
              const isActive = device.status === "active";

              return (
                <div
                  key={device.deviceId}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#077C74] dark:text-[#1BD1C0] shrink-0 mt-0.5">
                      <Smartphone className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {device.label || "Android Settlement Node"}
                        </span>
                        <Badge variant={isActive ? "emerald" : "slate"} size="sm" dot>
                          {device.status}
                        </Badge>
                      </div>

                      <p className="text-xs font-mono text-zinc-500">ID: {device.deviceId}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        <span>Last sync: {device.lastSeenAt || "Recent"}</span>
                        <span>•</span>
                        <span>Registered: {device.createdAt || "Active"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isActive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRevokeDevice(device)}
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Revoke Device
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(revokeDevice)}
        onClose={() => setRevokeDevice(null)}
        onConfirm={handleConfirmRevoke}
        title="Revoke Companion Node?"
        description={`Revoking device ${revokeDevice?.deviceId} will terminate its bearer token immediately. Incoming SMS payments from this device will no longer be matched.`}
        confirmLabel="Revoke Device Now"
        variant="danger"
        loading={isRevoking}
      />

      {/* Pair New Device Modal */}
      <Modal
        open={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        title="Pair Android Companion Device"
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Open the GressPay Companion APK on your Android device and paste your merchant public key to complete pairing:
          </p>

          <CopyField label="Pairing Key" value={pairToken} />

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
            <span className="font-semibold">Battery Optimization Warning:</span>
            <p className="text-[11px] leading-relaxed">
              Ensure you disable Battery Optimization for GressPay Companion on your Android phone so background SMS listeners remain active uninterrupted.
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button size="sm" variant="outline" onClick={() => setIsPairModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
