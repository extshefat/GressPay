"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Rail = { code: string; enabled: boolean; available: boolean };
type Tx = { session_id: string; brand_id: string; amount: string; currency: string; status: string; method_code: string | null };
type Device = { device_id: string; brand_id: string; label: string | null; status: string };

export function AdminPlatformPanel() {
  const [rails, setRails] = useState<Rail[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [merchants, setMerchants] = useState<{ id: string; name: string; email: string; status: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [g, t, d, m] = await Promise.all([
        api.getAdminGateways(),
        api.getAdminTransactions(),
        api.getAdminDevices(),
        api.getAdminMerchants(),
      ]);
      setRails(g.gateways);
      setTransactions(t.transactions);
      setDevices(d.devices);
      setMerchants(m.merchants);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load platform controls.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (rail: Rail) => {
    if (!rail.available) return;
    try {
      const res = await api.setAdminGateway(rail.code, !rail.enabled);
      setRails(res.gateways);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not update gateway.");
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm(`Revoke device ${id}?`)) return;
    try {
      await api.revokeAdminDevice(id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not revoke device.");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Global gateways</h2>
        <p className="text-xs text-zinc-500">
          bKash, Nagad, Binance Pay, and USDT TRC-20 can be hidden from every checkout. Rocket, Upay, Cellfin, and Bybit Pay have no live verifier, so they stay unavailable.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {rails.map((rail) => (
            <div key={rail.code} className="flex items-center justify-between border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <span className="font-mono">{rail.code}</span>
              {rail.available ? (
                <Button size="sm" variant="secondary" onClick={() => toggle(rail)}>
                  {rail.enabled ? "Enabled" : "Disabled"}
                </Button>
              ) : (
                <span className="text-xs text-zinc-500">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">Users</h2>
        {merchants.map((merchant) => (
          <div key={merchant.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>{merchant.name} · {merchant.email}</span>
            <span>{merchant.status}</span>
            <Button size="sm" variant="secondary" onClick={() => api.setAdminRole(merchant.id, true).then(load)}>
              Make admin
            </Button>
            <Button size="sm" variant="secondary" onClick={() => api.setAdminRole(merchant.id, false).then(load)}>
              Remove admin
            </Button>
            <Button size="sm" variant="secondary" onClick={() => api.updateAdminMerchantStatus(merchant.id, merchant.status === "suspended" ? "active" : "suspended").then(load)}>
              {merchant.status === "suspended" ? "Activate" : "Suspend"}
            </Button>
          </div>
        ))}
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">Recent transactions</h2>
        <div className="max-h-64 overflow-auto text-xs">
          {transactions.length === 0 && <p className="text-zinc-500">No transactions.</p>}
          {transactions.map((tx) => (
            <div key={tx.session_id} className="flex justify-between gap-2 border-b border-zinc-100 py-1 dark:border-zinc-900">
              <span className="font-mono">{tx.session_id}</span>
              <span>{tx.amount} {tx.currency}</span>
              <span>{tx.status}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold">Connected devices</h2>
        {devices.length === 0 && <p className="text-xs text-zinc-500">No devices.</p>}
        {devices.map((device) => (
          <div key={device.device_id} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-mono">{device.device_id}</span>
            <span>{device.status}</span>
            <Button size="sm" variant="secondary" onClick={() => revoke(device.device_id)} disabled={device.status === "revoked"}>
              Revoke
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
