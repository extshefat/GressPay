"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { GpMark } from "@/components/brand/GpMark";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">("live");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const data = await api.getMe();
        if (isMounted) {
          setUser(data.user);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          api.clearToken();
          setIsLoading(false);
          router.push("/login");
        }
      }
    }

    checkAuth();

    setLedgerMode(api.getLedgerMode());
    const onMode = () => setLedgerMode(api.getLedgerMode());
    window.addEventListener("gresspay-mode", onMode);

    return () => {
      isMounted = false;
      window.removeEventListener("gresspay-mode", onMode);
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
        <p className="text-xs font-mono text-zinc-500">Authenticating merchant session...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <DashboardSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={user} onMenuClick={() => setMobileNavOpen(true)} />
        <main key={ledgerMode} className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
