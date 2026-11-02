"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rememberTeamInvite } from "@/features/auth/team-invite";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { PlanUsageBanner } from "@/features/dashboard/components/PlanUsageBanner";
import { NoBrandBanner } from "@/features/dashboard/components/NoBrandBanner";
import { GpMark } from "@/components/brand/GpMark";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">("live");
  const [activeBrandId, setActiveBrandId] = useState<string>("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (typeof window !== "undefined" && !api.hasToken()) {
        if (isMounted) {
          setIsLoading(false);
          rememberTeamInvite();
          router.replace("/login");
        }
        return;
      }

      const timeoutId = setTimeout(() => {
        if (isMounted) {
          setIsLoading(false);
          setAuthError("Account check timed out. Please retry or sign in again.");
        }
      }, 7000);

      try {
        const data = await api.getMe();
        if (isMounted) {
          clearTimeout(timeoutId);
          setUser(data.user);
          setIsLoading(false);
          setAuthError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          clearTimeout(timeoutId);
          api.clearToken();
          setIsLoading(false);
          rememberTeamInvite();
          router.replace("/login");
        }
      }
    }

    checkAuth();

    const advanced = window.localStorage.getItem("gresspay_advanced_test_ledger") === "1";
    if (!advanced) {
      api.setLedgerMode("live");
    }
    setLedgerMode(api.getLedgerMode());
    setActiveBrandId(api.getBrandId() || "");
    const onMode = () => setLedgerMode(api.getLedgerMode());
    const onBrand = () => setActiveBrandId(api.getBrandId() || "");
    window.addEventListener("gresspay-mode", onMode);
    window.addEventListener("gresspay-brand", onBrand);

    return () => {
      isMounted = false;
      window.removeEventListener("gresspay-mode", onMode);
      window.removeEventListener("gresspay-brand", onBrand);
    };
  }, [router]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center transition-colors">
        <GpMark size="lg" className="animate-pulse mb-3" />
        <p className="text-xs font-mono text-zinc-500">Loading your account…</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <GpMark size="lg" className="mb-4 text-rose-500" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Connection Delayed</h2>
        <p className="text-xs text-zinc-500 max-w-sm mb-6">{authError}</p>
        <div className="flex gap-3">
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              api.clearToken();
              router.push("/login");
            }}
          >
            Sign In Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-void text-zinc-900 transition-colors dark:text-zinc-100">
      <DashboardSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={user} onMenuClick={() => setMobileNavOpen(true)} />
        <main key={`${ledgerMode}-${activeBrandId}`} className="dashboard-canvas flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10">
          <NoBrandBanner user={user} />
          <PlanUsageBanner usage={user?.planUsage} className="mb-6 max-w-7xl mx-auto" />
          {children}
        </main>
      </div>
    </div>
  );
}
