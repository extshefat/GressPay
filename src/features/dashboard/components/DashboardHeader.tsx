"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { LogOut, Plus, Menu, Building2, ChevronDown, Check, Sliders } from "lucide-react";
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

  const handleLogout = () => {
    api.clearToken();
    router.push("/login");
  };

  const activeBrand = brands.find((b) => b.brandId === activeBrandId) || brands[0];

  return (
    <header className="h-14 sm:h-16 bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md transition-colors gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
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
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
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
                      <Check className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
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

        <Link href="/dashboard/payment-links" className="hidden sm:block">
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Create Link
          </Button>
        </Link>

        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-teal-700/10 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200 border border-teal-700/20 dark:border-teal-400/20 flex items-center justify-center text-xs font-bold">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "GP"}
          </div>
          <div className="hidden md:block text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[10rem]">
                {user?.businessName || user?.name || "Your account"}
              </span>
              {(user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin) && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded">
                  Admin
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[12rem]">{user?.email || ""}</div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="ml-1 p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
