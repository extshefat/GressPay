"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { breadcrumbsForPath } from "@/features/dashboard/nav";

interface DashboardPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  hideBreadcrumbs?: boolean;
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
  breadcrumbs,
  hideBreadcrumbs = false,
}: DashboardPageHeaderProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbs ?? breadcrumbsForPath(pathname || "/dashboard/overview");

  return (
    <section className="flex flex-col gap-4 border-b border-border/80 pb-6 dark:border-border/80 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/15 bg-ink-solid/10 text-ink dark:border-border/15 dark:bg-surface-muted/10 dark:text-ink">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          {!hideBreadcrumbs ? <Breadcrumb items={crumbs} className="mb-2" /> : null}
          {eyebrow ? <div className="dashboard-kicker">{eyebrow}</div> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="dashboard-title">{title}</h1>
            {badge}
          </div>
          <div className="dashboard-subtitle">{description}</div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}

interface DashboardSectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardSectionHeader({ title, description, actions }: DashboardSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="dashboard-section-title">{title}</h2>
        {description ? <div className="dashboard-section-copy">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
