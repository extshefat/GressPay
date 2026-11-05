"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X, ShieldCheck } from "lucide-react";
import { GpMark } from "@/components/brand/GpMark";
import { User } from "@/lib/types/api";
import { api } from "@/lib/api-client";
import {
  DASHBOARD_NAV_GROUPS,
  isNavItemActive,
  type NavGroup,
  type NavItem,
} from "@/features/dashboard/nav";

const COLLAPSE_KEY = "gresspay_sidebar_collapsed";

export interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  user?: User | null;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function usePersistedCollapse(
  controlled: boolean | undefined,
  onChange?: (v: boolean) => void
): [boolean, (v: boolean) => void] {
  const [local, setLocal] = useState(false);

  useEffect(() => {
    try {
      setLocal(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const value = controlled ?? local;
  const setValue = (next: boolean) => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setLocal(next);
    onChange?.(next);
  };
  return [value, setValue];
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  mobileOpen = false,
  onClose,
  user,
  collapsed: collapsedProp,
  onCollapsedChange,
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = usePersistedCollapse(collapsedProp, onCollapsedChange);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(true);
  const isAdmin = Boolean(
    user?.role === "admin" || user?.isAdmin || (user as { is_admin?: boolean })?.is_admin
  );

  useEffect(() => {
    let alive = true;
    api
      .getTeamMe()
      .then((me) => {
        if (alive) setIsWorkspaceOwner(Boolean(me.isWorkspaceOwner));
      })
      .catch(() => {
        if (alive) setIsWorkspaceOwner(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const visibleGroups = DASHBOARD_NAV_GROUPS.filter((g) => {
    if (g.id === "admin") return isAdmin;
    return true;
  }).map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.ownerOnly && !isWorkspaceOwner) return false;
      return true;
    }),
  }));

  const renderLink = (item: NavItem, iconsOnly: boolean) => {
    const isActive = isNavItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        title={item.label}
        aria-current={isActive ? "page" : undefined}
        className={`group flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong/40 ${
          iconsOnly ? "justify-center px-2" : ""
        } ${
          isActive
            ? item.adminOnly
              ? "border-warning bg-brand/10 text-ink"
              : "border-accent bg-brand/10 text-ink"
            : "border-transparent text-muted hover:bg-brand/5 hover:text-ink"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : "text-muted group-hover:text-ink"}`} />
        {!iconsOnly ? <span className="truncate">{item.label}</span> : null}
        {!iconsOnly && item.adminOnly ? (
          <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider">
            ADMIN
          </span>
        ) : null}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup, iconsOnly: boolean) => {
    if (group.items.length === 0) return null;
    return (
      <div key={group.id} className={group.id === "admin" ? "mt-3 border-t border-border pt-4" : "mt-3 first:mt-0"}>
        {!iconsOnly ? (
          <div
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
              group.id === "admin" ? "text-warning" : "text-muted"
            }`}
          >
            {group.label}
          </div>
        ) : (
          <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden />
        )}
        <div className="mt-1 space-y-0.5">{group.items.map((item) => renderLink(item, iconsOnly))}</div>
      </div>
    );
  };

  const brandBlock = (iconsOnly: boolean) => (
    <div className={`flex items-center justify-between gap-2 border-b border-border ${iconsOnly ? "px-2 py-4" : "px-5 py-5"}`}>
      <Link href="/" className={`flex items-center ${iconsOnly ? "justify-center w-full" : "gap-2.5"}`} onClick={onClose}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/[0.08]">
          <GpMark />
        </span>
        {!iconsOnly ? (
          <div>
            <div className="text-[15px] font-bold tracking-tight text-ink">GressPay</div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted/80">Business OS</div>
          </div>
        ) : null}
      </Link>
      {onClose && !iconsOnly ? (
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-lg p-2 text-muted hover:bg-white/10 hover:text-ink lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  const footer = (iconsOnly: boolean) => (
    <div className={`border-t border-border ${iconsOnly ? "p-2" : "p-3"} space-y-2`}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted transition hover:bg-brand/5 hover:text-ink lg:flex"
        aria-pressed={collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!iconsOnly ? <span>Collapse</span> : null}
      </button>
      {!iconsOnly ? (
        <Link
          href="/developers"
          onClick={onClose}
          className="block rounded-lg border border-border bg-white/[0.04] p-3 text-xs transition hover:border-border/25 hover:bg-white/[0.07]"
        >
          <div className="font-semibold text-ink">Developer documentation</div>
          <div className="mt-0.5 text-[11px] text-muted">REST APIs, SDKs and webhooks</div>
        </Link>
      ) : (
        <Link
          href="/developers"
          onClick={onClose}
          title="Developer documentation"
          className="flex min-h-11 items-center justify-center rounded-lg border border-border text-muted hover:text-ink"
        >
          <ShieldCheck className="h-4 w-4" />
        </Link>
      )}
    </div>
  );

  const desktopNav = (
    <>
      {brandBlock(collapsed)}
      <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? "px-1.5" : "px-3"}`} aria-label="Dashboard">
        {visibleGroups.map((g) => renderGroup(g, collapsed))}
      </nav>
      {footer(collapsed)}
    </>
  );

  const mobileNav = (
    <>
      {brandBlock(false)}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        {visibleGroups.map((g) => renderGroup(g, false))}
      </nav>
      {footer(false)}
    </>
  );

  return (
    <>
      <aside
        className={`hidden min-h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[4.5rem]" : "w-[17rem]"
        }`}
      >
        {desktopNav}
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-ink-solid/50"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-overlay transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {mobileNav}
        </aside>
      </div>
    </>
  );
};
