import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "./card";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    trend?: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  subtitle,
  badge,
  loading = false,
  className = "",
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={`p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-surface-muted dark:bg-surface-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-surface-muted dark:bg-surface-muted rounded-lg animate-pulse" />
        </div>
        <div className="h-7 w-32 bg-surface-muted dark:bg-surface-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-surface-muted dark:bg-surface-muted rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card
      className={`p-5 transition-all  hover:border-accent/20 hover:shadow-lg dark:hover:border-accent/20 ${onClick ? "cursor-pointer" : ""} ${className}`}
      interactive={Boolean(onClick)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted dark:text-muted">
            {title}
          </span>
          <div className="tabular-nums text-2xl font-bold tracking-[-0.035em] text-ink dark:text-ink">
            {value}
          </div>
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/10 bg-brand/10 text-accent dark:border-accent/10 dark:bg-brand/10 dark:text-accent">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {change ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono ${
                change.trend === "up"
                  ? "bg-success/10 text-success dark:bg-success/40 dark:text-success"
                  : change.trend === "down"
                  ? "bg-danger/10 text-danger dark:bg-danger/40 dark:text-danger"
                  : "bg-surface text-muted dark:bg-surface-muted dark:text-muted"
              }`}
            >
              {change.trend === "up" && <TrendingUp className="w-3 h-3" />}
              {change.trend === "down" && <TrendingDown className="w-3 h-3" />}
              {change.trend === "neutral" && <Minus className="w-3 h-3" />}
              {change.value}
            </span>
            {change.label && (
              <span className="text-muted dark:text-muted text-[11px]">
                {change.label}
              </span>
            )}
          </div>
        ) : subtitle ? (
          <span className="text-muted dark:text-muted text-[11px]">{subtitle}</span>
        ) : (
          <span />
        )}
        {badge}
      </div>
    </Card>
  );
}
