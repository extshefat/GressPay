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
  { href: "/dashboard/landing-pages", label: "Landing Pages", icon: FileText },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/my-payments", label: "My Payments", icon: CreditCard },
  { href: "/dashboard/credits", label: "Credits & Balance", icon: CreditCard },
  { href: "/dashboard/methods", label: "Payment Gateways", icon: Sliders },
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
        className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300/40 ${
          isActive
            ? "bg-neutral-400 text-[#111111] shadow-[0_5px_18px_rgba(0,0,0,0.16)]"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? "text-[#111111]" : "text-slate-500 transition-colors group-hover:text-slate-200"}`} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const nav = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] ring-1 ring-white/[0.08]">
            <GpMark inverse />
          </span>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-white">GressPay</div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-300/80">Merchant OS</div>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {CORE_NAV.map(renderLink)}

        <div className="mt-3 border-t border-white/[0.08] pt-4">
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Automation
          </div>
          <div className="mt-1 space-y-1">{AUTOMATION_NAV.map(renderLink)}</div>
        </div>

        {(user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin) && (
          <div className="mt-3 border-t border-white/[0.08] pt-4">
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Platform Admin
            </div>
            <Link
              href="/dashboard/admin"
              onClick={onClose}
              className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
                pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin")
                  ? "bg-neutral-400 text-[#111111] shadow-[0_5px_18px_rgba(0,0,0,0.16)]"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Super Admin</span>
              </div>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider">
                ADMIN
              </span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <Link
          href="/developers"
          onClick={onClose}
          className="block rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs transition hover:border-neutral-300/25 hover:bg-white/[0.07]"
        >
          <div className="font-semibold text-white">Developer documentation</div>
          <div className="mt-0.5 text-[11px] text-slate-400">REST APIs, SDKs and webhooks</div>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden min-h-screen w-[17rem] shrink-0 flex-col border-r border-white/[0.06] bg-[#171717] lg:flex">
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
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/[0.06] bg-[#171717] shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {nav}
        </aside>
      </div>
    </>
  );
};
