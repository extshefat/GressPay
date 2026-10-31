"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CopyField } from "@/components/ui/copy-field";
import { useToast } from "@/components/ui/toast";
import { MerchantEnvSnippet } from "@/features/developers/MerchantEnvSnippet";
import { Building2, Plus, RefreshCw, Check, Copy } from "lucide-react";

type BrandRow = {
  brandId: string;
  name: string;
  active: boolean;
  deviceCount: number;
  gatewayCount: number;
  apiKeyMasked?: string;
  webhookUrl?: string | null;
};

export default function BrandsPage() {
  const { success, error: toastError } = useToast();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [activeBrandId, setActiveBrandId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBrands();
      setBrands(data.brands || []);
      setActiveBrandId(data.activeBrandId || "");
      if (data.activeBrandId) api.setBrandId(data.activeBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("create");
    try {
      await api.createBrand(name.trim());
      setName("");
      success("Brand created and selected");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not create brand.");
    } finally {
      setBusy(null);
    }
  };

  const switchTo = async (brandId: string) => {
    setBusy(brandId);
    try {
      const res = await api.switchBrand(brandId);
      success(`Switched to ${res.name}`);
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not switch brand.");
    } finally {
      setBusy(null);
    }
  };

  const activeBrand = brands.find((b) => b.brandId === activeBrandId || b.active);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Brands</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Each brand has its own API keys, gateways, devices, and webhooks. Switch brands from this page.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="danger" title="Brands">
          {error}
        </Alert>
      )}

      <MerchantEnvSnippet />

      {activeBrand?.apiKeyMasked && activeBrand.apiKeyMasked !== "—" && (
        <CopyField label="Active brand API key (masked)" value={activeBrand.apiKeyMasked} masked canUnmask={false} />
      )}

      <Card className="space-y-4 border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add New Brand</h2>
        </div>
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Brand name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EXT X CHEATS (extxcheats.com)"
              required
            />
          </div>
          <Button type="submit" isLoading={busy === "create"} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Add New Brand
          </Button>
        </form>
      </Card>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Brand name</th>
              <th className="px-4 py-2">Brand key (website)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b, idx) => (
              <tr key={b.brandId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span>{b.apiKeyMasked || "—"}</span>
                    {b.apiKeyMasked && b.apiKeyMasked !== "—" && (
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        aria-label="Copy masked key prefix"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(b.apiKeyMasked || "");
                            success("Prefix copied (full secret is only shown when you create a key)");
                          } catch {
                            toastError("Could not copy");
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {b.active || b.brandId === activeBrandId ? (
                    <Badge variant="emerald" size="sm" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="slate" size="sm">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {b.active || b.brandId === activeBrandId ? (
                    <Button size="sm" variant="outline" disabled leftIcon={<Check className="h-3.5 w-3.5" />}>
                      Selected
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => switchTo(b.brandId)} isLoading={busy === b.brandId}>
                      Switch
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && brands.length === 0 && (
          <p className="p-4 text-xs text-zinc-500">No brands yet — create your first store above.</p>
        )}
      </div>
    </div>
  );
}
