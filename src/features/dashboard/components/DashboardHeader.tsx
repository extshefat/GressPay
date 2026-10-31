"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/lib/theme";
import { LogOut, Plus, Menu } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  user: User | null;
  onMenuClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onMenuClick }) => {
  const router = useRouter();

  const handleLogout = () => {
    api.clearToken();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white/90 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md transition-colors gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Badge variant="emerald" size="sm" dot>
          Production
        </Badge>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle size="sm" />

        <Link href="/dashboard/payment-links" className="hidden sm:block">
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Create Link
          </Button>
        </Link>

        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs text-zinc-900 dark:text-zinc-100 font-bold">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "GP"}
          </div>
          <div className="hidden md:block text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.businessName || user?.name || "Your account"}
              </span>
              {(user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin) && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded border border-zinc-900 dark:border-zinc-100">
                  Super Admin
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">{user?.email || ""}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="ml-1 p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
