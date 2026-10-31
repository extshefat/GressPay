"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Link2,
  FileText,
  Sliders,
  Key,
  Settings,
  Smartphone,
  ShieldCheck,
  Building2,
  Puzzle,
  Bell,
  LifeBuoy,
  Webhook,
  Users,
  X,
  Activity,
  CreditCard,
} from "lucide-react";
import { GpMark } from "@/components/brand/GpMark";
import { User } from "@/lib/types/api";

const CORE_NAV = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/payment-links", label: "Payment Links", icon: Link2 },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/my-payments", label: "My Payments", icon: CreditCard },
  { href: "/dashboard/methods", label: "View Gateways", icon: Sliders },
  { href: "/dashboard/brands", label: "Brands", icon: Building2 },
  { href: "/dashboard/devices", label: "Devices", icon: Smartphone },
  { href: "/dashboard/apps", label: "Apps & Plugins", icon: Puzzle },
  { href: "/dashboard/api-keys", label: "Webhooks & Integration", icon: Key },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const AUTOMATION_NAV = [
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/dashboard/payment-events", label: "Payment events", icon: Activity },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

export interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  user?: User | null;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  mobileOpen = false,
  onClose,
  user,
}) => {
  const pathname = usePathname();

  const renderLink = (item: (typeof CORE_NAV)[0]) => {
    const isActive = pathname.startsWith(item.href) || pathname === item.href.replace("/dashboard", "");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          isActive
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const nav = (
    <>
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <GpMark />
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">GressPay</div>
            <div className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Dashboard</div>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {CORE_NAV.map(renderLink)}

        <div className="pt-3 mt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Automation
          </div>
          <div className="mt-1 space-y-1">{AUTOMATION_NAV.map(renderLink)}</div>
        </div>

        {(user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin) && (
          <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Platform Admin
            </div>
            <Link
              href="/dashboard/admin"
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin")
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin</span>
              </div>
              <span className="text-[9px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                ADMIN
              </span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/developers"
          onClick={onClose}
          className="block p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs transition-colors hover:border-zinc-400 dark:hover:border-zinc-700"
        >
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">API Documentation</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">REST endpoints & IPN signatures</div>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-col shrink-0 min-h-screen transition-colors">
        {nav}
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {nav}
        </aside>
      </div>
    </>
  );
};
