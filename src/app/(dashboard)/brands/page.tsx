"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { MerchantEnvSnippet } from "@/features/developers/MerchantEnvSnippet";
import { Plus, RefreshCw, Copy, MoreVertical, Check } from "lucide-react";
import Link from "next/link";

type BrandRow = {
  brandId: string;
  name: string;
  active: boolean;
  deviceCount: number;
  gatewayCount: number;
  websiteApiKey?: string;
  websiteApiKeyMasked?: string;
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
      success("Brand created with a live website API key — use Copy in the table anytime.");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not create brand.");
    } finally {
      setBusy(null);
    }
  };

  const switchTo = async (brandId: string) => {
    setBusy(brandId);
    setMenuOpen(null);
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

  const copyWebsiteKey = async (b: BrandRow) => {
    const full = b.websiteApiKey?.trim();
    if (!full) {
      toastError(
        "No re-copyable key on file. Create a new live key under API & Webhooks — keys issued after this update stay copyable here.",
        "Key unavailable"
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(full);
      success("Website API key copied to clipboard");
    } catch {
      toastError("Clipboard blocked — select and copy manually.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Brands</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Brand website API keys for <code className="font-mono">POST /payment/create</code> on your store. Copy anytime from this table.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Brands">
          {error}
        </Alert>
      )}

      <MerchantEnvSnippet />

      <Card className="space-y-4 border-zinc-200 p-6 dark:border-zinc-800">
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Brand name</th>
              <th className="px-4 py-3">Brand key / API key (for website)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b, idx) => (
              <tr key={b.brandId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                      {b.websiteApiKeyMasked || "—"}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      aria-label={`Copy website API key for ${b.name}`}
                      onClick={() => copyWebsiteKey(b)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
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
                <td className="px-4 py-3 text-right relative">
                  <button
                    type="button"
                    className="inline-flex rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Brand actions"
                    onClick={() => setMenuOpen(menuOpen === b.brandId ? null : b.brandId)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpen === b.brandId && (
                    <div className="absolute right-4 top-10 z-20 min-w-[160px] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      {!(b.active || b.brandId === activeBrandId) && (
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          onClick={() => switchTo(b.brandId)}
                        >
                          Switch to brand
                        </button>
                      )}
                      {(b.active || b.brandId === activeBrandId) && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </div>
                      )}
                      <Link
                        href="/dashboard/api-keys"
                        className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        onClick={() => setMenuOpen(null)}
                      >
                        Manage API keys
                      </Link>
                      <Link
                        href="/dashboard/methods"
                        className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        onClick={() => setMenuOpen(null)}
                      >
                        Configure gateways
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && brands.length === 0 && (
          <p className="p-6 text-center text-xs text-zinc-500">No brands yet — add your first store above.</p>
        )}
      </div>
    </div>
  );
}
