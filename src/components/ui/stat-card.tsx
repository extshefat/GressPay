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
          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-7 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card
      className={`p-5 transition-all hover:-translate-y-0.5 hover:border-teal-700/20 hover:shadow-lg dark:hover:border-teal-300/20 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
          <div className="text-2xl font-bold tracking-[-0.035em] text-zinc-900 dark:text-zinc-100">
            {value}
          </div>
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-700/10 bg-teal-700/10 text-teal-800 dark:border-teal-300/10 dark:bg-teal-300/10 dark:text-teal-300">
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
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : change.trend === "down"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {change.trend === "up" && <TrendingUp className="w-3 h-3" />}
              {change.trend === "down" && <TrendingDown className="w-3 h-3" />}
              {change.trend === "neutral" && <Minus className="w-3 h-3" />}
              {change.value}
            </span>
            {change.label && (
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                {change.label}
              </span>
            )}
          </div>
        ) : subtitle ? (
          <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">{subtitle}</span>
        ) : (
          <span />
        )}
        {badge}
      </div>
    </Card>
  );
}
