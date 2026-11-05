import type { LucideIcon } from "lucide-react";
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
  Activity,
  CreditCard,
  Scale,
  Layers,
  Coins,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  ownerOnly?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: "collect" | "setup" | "account" | "admin";
  label: string;
  items: NavItem[];
};

export const DASHBOARD_NAV_GROUPS: NavGroup[] = [
  {
    id: "collect",
    label: "Collect",
    items: [
      {
        href: "/dashboard/overview",
        label: "Overview",
        icon: LayoutDashboard,
        keywords: ["home", "metrics", "kpi"],
      },
      {
        href: "/dashboard/transactions",
        label: "Transactions",
        icon: ArrowLeftRight,
        keywords: ["payments", "trxid", "sessions"],
      },
      {
        href: "/dashboard/payment-links",
        label: "Payment links",
        icon: Link2,
        keywords: ["link", "pay", "checkout"],
      },
      {
        href: "/dashboard/invoices",
        label: "Invoices",
        icon: FileText,
        keywords: ["bill", "invoice"],
      },
      {
        href: "/dashboard/landing-pages",
        label: "Landing pages",
        icon: Layers,
        keywords: ["store", "page"],
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      {
        href: "/dashboard/brands",
        label: "Brands",
        icon: Building2,
        keywords: ["workspace", "site"],
      },
      {
        href: "/dashboard/methods",
        label: "Gateways / Methods",
        icon: Sliders,
        keywords: ["bkash", "nagad", "binance", "usdt", "rails"],
      },
      {
        href: "/dashboard/devices",
        label: "Devices",
        icon: Smartphone,
        keywords: ["apk", "companion", "sms"],
      },
      {
        href: "/dashboard/api-keys",
        label: "API keys",
        icon: Key,
        keywords: ["secret", "integration", "snippet"],
      },
      {
        href: "/dashboard/webhooks",
        label: "Webhooks",
        icon: Webhook,
        keywords: ["delivery", "callback"],
      },
      {
        href: "/dashboard/apps",
        label: "Apps & plugins",
        icon: Puzzle,
        keywords: ["wordpress", "plugin"],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        href: "/dashboard/team",
        label: "Team",
        icon: Users,
        ownerOnly: true,
        keywords: ["invite", "roles"],
      },
      {
        href: "/dashboard/my-payments",
        label: "Billing / Credits",
        icon: CreditCard,
        keywords: ["plan", "upgrade", "subscription"],
      },
      {
        href: "/dashboard/credits",
        label: "Credits ledger",
        icon: Coins,
        keywords: ["balance"],
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        keywords: ["telegram", "discord", "alerts"],
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: Bell,
        keywords: ["inbox", "alerts"],
      },
      {
        href: "/dashboard/support",
        label: "Support",
        icon: LifeBuoy,
        keywords: ["help", "ticket"],
      },
      {
        href: "/dashboard/reconciliation",
        label: "Reconciliation",
        icon: Scale,
        keywords: ["match", "ledger"],
      },
      {
        href: "/dashboard/payment-events",
        label: "Payment events",
        icon: Activity,
        keywords: ["log", "events"],
      },
    ],
  },
  {
    id: "admin",
    label: "Platform admin",
    items: [
      {
        href: "/dashboard/admin",
        label: "Admin console",
        icon: ShieldCheck,
        adminOnly: true,
        keywords: ["accounts", "plans", "audit", "health"],
      },
    ],
  },
];

export function flattenNavItems(groups: NavGroup[] = DASHBOARD_NAV_GROUPS): NavItem[] {
  return groups.flatMap((g) => g.items);
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const bare = href.replace(/^\/dashboard/, "") || "/";
  if (pathname === bare) return true;
  if (href !== "/dashboard/overview" && (pathname.startsWith(href) || pathname.startsWith(bare))) {
    return true;
  }
  return false;
}

export function breadcrumbsForPath(pathname: string): Array<{ label: string; href?: string }> {
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Dashboard", href: "/dashboard/overview" },
  ];
  const item = flattenNavItems().find((n) => isNavItemActive(pathname, n.href));
  if (item) {
    const group = DASHBOARD_NAV_GROUPS.find((g) => g.items.some((i) => i.href === item.href));
    if (group && group.id !== "admin") {
      crumbs.push({ label: group.label });
    }
    crumbs.push({ label: item.label });
  } else if (pathname.includes("/admin")) {
    crumbs.push({ label: "Platform admin" });
  }
  return crumbs;
}
