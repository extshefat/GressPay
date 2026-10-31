"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { MerchantEnvSnippet } from "@/features/developers/MerchantEnvSnippet";
import { Plus, RefreshCw, Copy, MoreVertical, Check, RotateCw } from "lucide-react";
import Link from "next/link";

type BrandRow = {
  brandId: string;
  name: string;
  active: boolean;
  deviceCount: number;
  gatewayCount: number;
  websiteApiKey?: string;
  websiteApiKeyMasked?: string;
  websiteApiKeyCopyable?: boolean;
  webhookUrl?: string | null;
};

const MASKED_KEY = "**********";

export default function BrandsPage() {
  const { success, error: toastError } = useToast();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [activeBrandId, setActiveBrandId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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
      setAddOpen(false);
      success("Brand created — copy the website API key from the table for your store integration.");
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
      if (
        window.confirm(
          "This brand’s website key cannot be re-copied yet (legacy row). Rotate the website key now? The old secret stops working immediately."
        )
      ) {
        await rotateWebsiteKey(b);
      } else {
        toastError(
          "Use Rotate in the actions column to issue a re-copyable secret.",
          "Key unavailable"
        );
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(full);
      success("Website API key copied to clipboard");
    } catch {
      toastError("Clipboard blocked — select and copy manually.");
    }
  };

  const rotateWebsiteKey = async (b: BrandRow) => {
    setBusy(`rotate-${b.brandId}`);
    setMenuOpen(null);
    try {
      const res = await api.rotateBrandWebsiteKey(b.brandId);
      await load();
      try {
        await navigator.clipboard.writeText(res.websiteApiKey);
        success("New website API key copied — you can copy again anytime from this table.");
      } catch {
        success(res.note, "Website key rotated");
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not rotate website key.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Brands</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
            Each brand has one <strong className="font-semibold text-zinc-700 dark:text-zinc-300">website API key</strong>{" "}
            for server-side checkout (<code className="font-mono">POST /payment/create</code>). Use it on your store
            only — not in the Companion app. Device keys are under{" "}
            <Link href="/dashboard/devices" className="font-semibold underline">
              Devices
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} isLoading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Add New Brand
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Brands">
          {error}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Brand Name</th>
              <th className="px-4 py-3">Brand Key / API Key (For Website)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b, idx) => (
              <tr key={b.brandId} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3.5 text-zinc-500">{idx + 1}</td>
                <td className="px-4 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] tracking-wider text-zinc-600 dark:text-zinc-400">
                      {b.websiteApiKeyMasked || (b.websiteApiKey ? MASKED_KEY : "—")}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      aria-label={`Copy website API key for ${b.name}`}
                      title="Copy website key"
                      onClick={() => copyWebsiteKey(b)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3.5">
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
                <td className="relative px-4 py-3.5 text-right">
                  <div className="inline-flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      aria-label={`Rotate website key for ${b.name}`}
                      title="Rotate website key"
                      disabled={busy === `rotate-${b.brandId}`}
                      onClick={() => rotateWebsiteKey(b)}
                    >
                      <RotateCw className={`h-4 w-4 ${busy === `rotate-${b.brandId}` ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-label="More brand actions"
                      onClick={() => setMenuOpen(menuOpen === b.brandId ? null : b.brandId)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  {menuOpen === b.brandId && (
                    <div className="absolute right-4 top-10 z-20 min-w-[180px] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
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
                          <Check className="h-3.5 w-3.5" /> Selected in dashboard
                        </div>
                      )}
                      <Link
                        href="/dashboard/api-keys"
                        className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        onClick={() => setMenuOpen(null)}
                      >
                        Webhooks & integration
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
        {loading && brands.length === 0 && (
          <p className="p-8 text-center text-xs text-zinc-500">Loading brands…</p>
        )}
        {!loading && brands.length === 0 && (
          <div className="space-y-3 p-10 text-center">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No brands yet</p>
            <p className="mx-auto max-w-md text-xs text-zinc-500">
              Add your first store brand to get a website API key for checkout integration. Companion phones use separate
              device keys on the Devices page.
            </p>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add New Brand
            </Button>
          </div>
        )}
      </div>

      <MerchantEnvSnippet />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Brand">
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          A live website API key is created automatically. Copy it from the table for server-side{" "}
          <code className="font-mono">/payment/create</code> calls on your website — never paste it into the Companion
          app.
        </p>
        <form onSubmit={create} className="space-y-4">
          <Input
            label="Brand name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. EXT X CHEATS"
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={busy === "create"} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Create brand
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
