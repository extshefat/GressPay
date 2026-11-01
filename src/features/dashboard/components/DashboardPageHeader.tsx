import React from "react";

interface DashboardPageHeaderProps {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <section className="flex flex-col gap-5 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-700/15 bg-teal-700/10 text-teal-800 dark:border-teal-300/15 dark:bg-teal-300/10 dark:text-teal-300">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="dashboard-kicker">{eyebrow}</div>
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
