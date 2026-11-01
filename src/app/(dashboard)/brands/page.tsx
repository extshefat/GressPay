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
import { Plus, RefreshCw, Copy, MoreVertical, Check, RotateCw, ImageIcon, Star, Trash2 } from "lucide-react";
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
  logoConfigured?: boolean;
  logoUrl?: string | null;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Logo upload modal state
  const [logoModalBrand, setLogoModalBrand] = useState<BrandRow | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platformBillingBrandId, setPlatformBillingBrandId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBrands();
      setBrands(data.brands || []);
      setActiveBrandId(data.activeBrandId || "");
      if (data.activeBrandId) api.setBrandId(data.activeBrandId);

      const me = await api.getMe().catch(() => null);
      const admin =
        me?.user?.role === "admin" ||
        Boolean(me?.user?.isAdmin) ||
        Boolean((me?.user as { is_admin?: boolean } | undefined)?.is_admin);
      setIsAdmin(admin);
      if (admin) {
        const billing = await api.getAdminBillingBrand().catch(() => null);
        setPlatformBillingBrandId(billing?.billingBrandId ?? null);
      } else {
        setPlatformBillingBrandId(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyToClipboard = async (text: string, label: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(keyId);
      setTimeout(() => setCopiedId(null), 2000);
      success(`${label} copied to clipboard`);
    } catch {
      toastError("Clipboard blocked — copy manually.");
    }
  };

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

  const setAsPlatformBilling = async (b: BrandRow) => {
    if (!isAdmin) {
      toastError("Only Super Admin can set the platform billing brand.");
      setMenuOpen(null);
      return;
    }
    setBusy(`billing-${b.brandId}`);
    setMenuOpen(null);
    try {
      await api.setAdminBillingBrand(b.brandId);
      setPlatformBillingBrandId(b.brandId);
      success(`Brand "${b.name}" set as the Platform Billing Brand.`);
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not set platform billing brand.");
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
    await copyToClipboard(full, "Website API key", `web-${b.brandId}`);
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

  const openLogoModal = (b: BrandRow) => {
    setLogoModalBrand(b);
    setLogoPreviewUrl(b.logoUrl || null);
    setMenuOpen(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !logoModalBrand) return;
    if (!file.type.startsWith("image/")) {
      toastError("Please select a valid image file (PNG, JPEG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError("Image size must be less than 2MB.");
      return;
    }
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await api.uploadDirectBrandLogo(logoModalBrand.brandId, dataUrl);
        setLogoPreviewUrl(dataUrl);
        success("Brand logo updated successfully! This logo will appear on checkout.");
        await load();
      } catch (err: unknown) {
        toastError(err instanceof Error ? err.message : "Failed to upload brand logo.");
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDelete = async () => {
    if (!logoModalBrand) return;
    setUploadingLogo(true);
    try {
      await api.deleteBrandLogo(logoModalBrand.brandId);
      setLogoPreviewUrl(null);
      success("Brand logo removed.");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Brands</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
            Each brand has its own <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Brand ID</strong>,{" "}
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Brand Logo</strong> (shown on checkout), and{" "}
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">website API key</strong> for server-side checkout (<code className="font-mono">POST /payment/create</code>).
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
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Brand & Logo</th>
              <th className="px-4 py-3">Brand ID (Billing & Config)</th>
              <th className="px-4 py-3">Website API Key</th>
              <th className="px-4 py-3">Status & Gateways</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b, idx) => {
              const isSelected = b.active || b.brandId === activeBrandId;
              const isCopiedBid = copiedId === `bid-${b.brandId}`;
              const isCopiedKey = copiedId === `web-${b.brandId}`;

              return (
                <tr key={b.brandId} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                  <td className="px-4 py-3.5 text-zinc-500">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {b.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logoUrl}
                            alt={b.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <span className="font-bold text-xs text-zinc-600 dark:text-zinc-300">
                            {b.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 flex-wrap">
                          <span>{b.name}</span>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Current
                            </span>
                          )}
                          {platformBillingBrandId === b.brandId && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Billing Brand
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openLogoModal(b)}
                          className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>{b.logoUrl ? "Change logo" : "Upload logo"}</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg w-fit border border-zinc-200/80 dark:border-zinc-800">
                      <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 select-all">
                        {b.brandId}
                      </span>
                      <button
                        type="button"
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                        title="Copy Brand ID"
                        onClick={() => copyToClipboard(b.brandId, "Brand ID", `bid-${b.brandId}`)}
                      >
                        {isCopiedBid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
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
                        {isCopiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1">
                      <Badge variant={isSelected ? "emerald" : "slate"}>
                        {isSelected ? "Active" : "Inactive"}
                      </Badge>
                      <div className="text-[11px] font-mono text-zinc-500">
                        {b.gatewayCount} live gateway{b.gatewayCount === 1 ? "" : "s"}
                      </div>
                    </div>
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
                      <div className="absolute right-4 top-10 z-20 min-w-[200px] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 text-left">
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                          onClick={() => openLogoModal(b)}
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Upload / Change Logo</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-medium"
                            onClick={() => setAsPlatformBilling(b)}
                            disabled={busy === `billing-${b.brandId}`}
                          >
                            <Star className="h-3.5 w-3.5 text-emerald-500" />
                            <span>
                              {platformBillingBrandId === b.brandId
                                ? "Billing brand (active)"
                                : "Set as Billing Brand"}
                            </span>
                          </button>
                        )}
                        {!isSelected && (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            onClick={() => switchTo(b.brandId)}
                          >
                            Switch to this brand
                          </button>
                        )}
                        <Link
                          href="/dashboard/methods"
                          className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          onClick={() => setMenuOpen(null)}
                        >
                          Configure gateways
                        </Link>
                        <Link
                          href="/dashboard/api-keys"
                          className="block px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          onClick={() => setMenuOpen(null)}
                        >
                          Webhooks & integration
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
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

      {/* Add New Brand Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Brand">
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          A live website API key and Brand ID are created automatically. Copy the key from the table for server-side{" "}
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

      {/* Upload Brand Logo Modal */}
      <Modal
        open={Boolean(logoModalBrand)}
        onClose={() => setLogoModalBrand(null)}
        title={`Brand Logo — ${logoModalBrand?.name || ""}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Upload a high-resolution logo for <strong className="text-zinc-800 dark:text-zinc-200">{logoModalBrand?.name}</strong>.
            This logo is prominently displayed on the customer-facing hosted checkout page.
          </p>

          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 gap-3">
            {logoPreviewUrl ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewUrl}
                  alt="Brand Logo Preview"
                  className="w-24 h-24 object-contain rounded-2xl bg-white border border-zinc-200 dark:border-zinc-700 p-2 shadow-sm"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}

            <div className="text-center space-y-1">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition">
                <span>Choose Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
              <p className="text-[10px] text-zinc-400">PNG, JPG, or WebP (max 2MB)</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            {logoPreviewUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                onClick={handleLogoDelete}
                isLoading={uploadingLogo}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Remove Logo
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setLogoModalBrand(null)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
