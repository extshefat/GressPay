"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { Building2, Plus, RefreshCw, Check } from "lucide-react";

type BrandRow = {
  brandId: string;
  name: string;
  active: boolean;
  deviceCount: number;
  gatewayCount: number;
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Brands &amp; Stores
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            One merchant account can manage multiple websites/brands. Gateways, devices, API keys, and
            webhooks are scoped to the active brand.
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

      <Card className="space-y-4 border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Add brand / website</h2>
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Brand name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EXT X CHEATS / shop.example.com"
              required
            />
          </div>
          <Button type="submit" isLoading={busy === "create"} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Create Brand
          </Button>
        </form>
        <p className="text-[11px] text-zinc-500">
          Starter: 1 brand · Pro: 5 · Enterprise/Lifetime: up to 50. Each brand gets its own API keys and
          webhook secret.
        </p>
      </Card>

      <div className="space-y-3">
        {brands.map((b) => (
          <Card
            key={b.brandId}
            className={`flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between ${
              b.active || b.brandId === activeBrandId
                ? "border-zinc-950 dark:border-white"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-900">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{b.name}</span>
                  {(b.active || b.brandId === activeBrandId) && (
                    <Badge variant="emerald" size="sm" dot>
                      Active
                    </Badge>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-zinc-500">{b.brandId}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {b.gatewayCount} gateway(s) · {b.deviceCount} active device(s)
                </div>
              </div>
            </div>
            {b.active || b.brandId === activeBrandId ? (
              <Button size="sm" variant="outline" disabled leftIcon={<Check className="h-3.5 w-3.5" />}>
                Selected
              </Button>
            ) : (
              <Button size="sm" onClick={() => switchTo(b.brandId)} isLoading={busy === b.brandId}>
                Switch to brand
              </Button>
            )}
          </Card>
        ))}
        {!loading && brands.length === 0 && (
          <p className="text-xs text-zinc-500">No brands yet — create your first store above.</p>
        )}
      </div>
    </div>
  );
}
