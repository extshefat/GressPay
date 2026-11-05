"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import {
  LogOut,
  Menu,
  Building2,
  ChevronDown,
  Check,
  Sliders,
  Search,
  Keyboard,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { CommandPalette, useCommandPaletteHotkey } from "@/features/dashboard/components/CommandPalette";

interface DashboardHeaderProps {
  user: User | null;
  onMenuClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onMenuClick }) => {
  const router = useRouter();
  const [brands, setBrands] = useState<Array<{ brandId: string; name: string }>>([]);
  const [activeBrandId, setActiveBrandId] = useState<string>("");
  const [switching, setSwitching] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedTest, setAdvancedTest] = useState(false);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">(() =>
    typeof window !== "undefined" ? api.getLedgerMode() : "live"
  );

  const isAdmin = Boolean(
    user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin
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
    setAdvancedTest(window.localStorage.getItem("gresspay_advanced_test_ledger") === "1");
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

  useCommandPaletteHotkey(() => setPaletteOpen(true));

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

  const setMode = (mode: "live" | "test") => {
    if (mode === "test" && !advancedTest) {
      window.localStorage.setItem("gresspay_advanced_test_ledger", "1");
      setAdvancedTest(true);
    }
    api.setLedgerMode(mode);
    setLedgerMode(mode);
  };

  const handleLogout = async () => {
    await api.clearToken();
    router.replace("/login");
  };

  const activeBrand = brands.find((b) => b.brandId === activeBrandId) || brands[0];

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-card)_92%,transparent)] px-4 transition-colors sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="min-h-11 min-w-11 -ml-1 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong/40 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div
            className={`inline-flex items-center gap-1 rounded-lg border px-1 py-1 ${
              ledgerMode === "live"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
            role="group"
            aria-label="Ledger mode"
          >
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`min-h-9 rounded-md px-2.5 text-[11px] font-bold uppercase tracking-wide ${
                ledgerMode === "live"
                  ? "bg-emerald-600 text-white"
                  : "text-muted hover:text-ink"
              }`}
              aria-pressed={ledgerMode === "live"}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => setMode("test")}
              className={`min-h-9 rounded-md px-2.5 text-[11px] font-bold uppercase tracking-wide ${
                ledgerMode === "test"
                  ? "bg-amber-500 text-ink"
                  : "text-muted hover:text-ink"
              }`}
              aria-pressed={ledgerMode === "test"}
              title="Test ledger — no real settlement"
            >
              Test
            </button>
          </div>

          {brands.length > 0 ? (
            <Dropdown
              align="left"
              trigger={
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong/30 sm:px-3"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="max-w-[110px] truncate sm:max-w-[150px]">
                    {activeBrand ? activeBrand.name : "Select Brand"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted" />
                </button>
              }
              items={[
                ...brands.map((b) => ({
                  id: b.brandId,
                  label: (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-medium">{b.name}</span>
                      {b.brandId === activeBrandId && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-ink dark:text-muted" />
                      )}
                    </div>
                  ),
                  icon: <Building2 className="h-3.5 w-3.5 opacity-60" />,
                  onClick: () => handleSwitchBrand(b.brandId),
                })),
                { divider: true, label: "" },
                {
                  id: "manage-brands",
                  label: "Manage Brands",
                  icon: <Sliders className="h-3.5 w-3.5" />,
                  onClick: () => router.push("/dashboard/brands"),
                },
              ]}
            />
          ) : (
            <Link href="/dashboard/brands" className="hidden sm:inline-flex">
              <Button size="sm" variant="outline" className="h-9 gap-1 text-xs">
                <Building2 className="h-3 w-3" />
                <span>Add Brand</span>
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden min-h-11 items-center gap-2 rounded-md border border-[var(--border-color)] px-2.5 text-xs text-muted transition hover:bg-[var(--bg-muted)] hover:text-ink sm:inline-flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-[var(--bg-muted)] hover:text-ink sm:hidden"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-[var(--bg-muted)] hover:text-ink"
              aria-expanded={helpOpen}
              aria-label="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            {helpOpen ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-border bg-surface p-3 text-xs shadow-overlay">
                <div className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Shortcuts
                </div>
                <ul className="space-y-1.5 text-muted">
                  <li className="flex justify-between gap-2">
                    <span>Command palette</span>
                    <kbd className="font-mono text-[10px]">Ctrl/⌘ K</kbd>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Close dialogs</span>
                    <kbd className="font-mono text-[10px]">Esc</kbd>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Live / Test</span>
                    <span className="text-[10px]">Header toggle</span>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          <ThemeToggle size="sm" />

          <div className="flex items-center gap-2.5 border-l border-[var(--border-color)] pl-2 sm:pl-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-muted)] text-xs font-bold text-[var(--text-primary)]">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "GP"}
            </div>
            <div className="hidden min-w-0 text-left md:block">
              <div className="flex items-center gap-2">
                <span className="max-w-[10rem] truncate text-xs font-semibold text-[var(--text-primary)]">
                  {user?.name || user?.businessName || "Your account"}
                </span>
                {isAdmin && (
                  <span className="rounded bg-[var(--text-primary)] px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--bg-page)]">
                    Admin
                  </span>
                )}
              </div>
              <div className="max-w-[12rem] truncate font-mono text-[10px] text-[var(--text-muted)]">
                {user?.email || ""}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="ml-1 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong/40"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {ledgerMode === "test" ? (
        <div
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-center text-[11px] font-medium text-ink sm:px-6"
          role="status"
        >
          Test ledger active — confirmations here do not move live funds.
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} isAdmin={isAdmin} />
    </>
  );
};
