"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { LogOut, Menu, Building2, ChevronDown, Check, Sliders } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";

interface DashboardHeaderProps {
  user: User | null;
  onMenuClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onMenuClick }) => {
  const router = useRouter();
  const [brands, setBrands] = useState<Array<{ brandId: string; name: string }>>([]);
  const [activeBrandId, setActiveBrandId] = useState<string>("");
  const [switching, setSwitching] = useState(false);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">(() =>
    typeof window !== "undefined" ? api.getLedgerMode() : "live"
  );

  const fetchBrands = useCallback(async () => {
    try {
      const data = await api.listBrands();
      setBrands(data.brands || []);
      const active = data.activeBrandId || api.getBrandId() || "";
      setActiveBrandId(active);
    } catch {
      // not loaded or unauthenticated
    }
  }, []);

  useEffect(() => {
    fetchBrands();
    const onBrandChanged = () => fetchBrands();
    const onMode = () => setLedgerMode(api.getLedgerMode());
    window.addEventListener("gresspay-brand", onBrandChanged);
    window.addEventListener("gresspay-mode", onMode);
    setLedgerMode(api.getLedgerMode());
    return () => {
      window.removeEventListener("gresspay-brand", onBrandChanged);
      window.removeEventListener("gresspay-mode", onMode);
    };
  }, [fetchBrands]);

  const handleSwitchBrand = async (brandId: string) => {
    if (brandId === activeBrandId || switching) return;
    try {
      setSwitching(true);
      await api.switchBrand(brandId);
      setActiveBrandId(brandId);
    } catch (err) {
      console.error("Failed to switch brand", err);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    await api.clearToken();
    router.replace("/login");
  };

  const activeBrand = brands.find((b) => b.brandId === activeBrandId) || brands[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 backdrop-blur-xl transition-colors sm:px-6">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/40"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Badge variant={ledgerMode === "test" ? "amber" : "emerald"} size="sm" dot>
          {ledgerMode === "test" ? "Test" : "Live"}
        </Badge>

        {brands.length > 0 ? (
          <Dropdown
            align="left"
            trigger={
              <button
                type="button"
                className="flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/30 sm:px-3"
              >
                <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[150px]">
                  {activeBrand ? activeBrand.name : "Select Brand"}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </button>
            }
            items={[
              ...brands.map((b) => ({
                id: b.brandId,
                label: (
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate font-medium">{b.name}</span>
                    {b.brandId === activeBrandId && (
                      <Check className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" />
                    )}
                  </div>
                ),
                icon: <Building2 className="w-3.5 h-3.5 opacity-60" />,
                onClick: () => handleSwitchBrand(b.brandId),
              })),
              { divider: true, label: "" },
              {
                id: "manage-brands",
                label: "Manage Brands",
                icon: <Sliders className="w-3.5 h-3.5" />,
                onClick: () => router.push("/dashboard/brands"),
              },
            ]}
          />
        ) : (
          <Link href="/dashboard/brands" className="hidden sm:inline-flex">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
              <Building2 className="w-3 h-3" />
              <span>Add Brand</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle size="sm" />

        <div className="flex items-center gap-2.5 border-l border-[var(--border-color)] pl-2 sm:pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] text-xs font-bold text-[var(--text-primary)]">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "GP"}
          </div>
          <div className="hidden md:block text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="max-w-[10rem] truncate text-xs font-semibold text-[var(--text-primary)]">
                {user?.name || user?.businessName || "Your account"}
              </span>
              {(user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin) && (
                <span className="rounded bg-[var(--text-primary)] px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--bg-page)]">
                  Admin
                </span>
              )}
            </div>
            <div className="max-w-[12rem] truncate font-mono text-[10px] text-[var(--text-muted)]">{user?.email || ""}</div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="ml-1 cursor-pointer rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/40"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
