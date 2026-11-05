import React from "react";
import { formatNumber } from "@/lib/formatters";
import { Card } from "./card";

export interface ChartContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  actions,
  children,
  className = "",
}: ChartContainerProps) {
  return (
    <Card className={`p-5 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-ink">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted dark:text-muted mt-0.5">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="w-full overflow-hidden">{children}</div>
    </Card>
  );
}

export function SimpleVolumeChart({
  data,
  height = 140,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted"
        style={{ height }}
      >
        No transaction activity recorded yet.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full flex flex-col justify-end gap-2" style={{ height }}>
      <div className="flex-1 flex items-end gap-2 px-1">
        {data.map((item, idx) => {
          const heightPercent = Math.max(0, Math.round((item.value / maxValue) * 100));
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
              tabIndex={0}
              aria-label={`${item.label}: ${formatNumber(item.value)}`}
            >
              <div
                className="w-full rounded-t-md bg-brand hover:bg-brand-hover transition-all duration-300"
                style={{ height: `${heightPercent}%` }}
              />
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 absolute top-0 bg-ink-solid text-white text-[10px] font-mono py-0.5 px-1.5 rounded pointer-events-none transition-opacity z-10 whitespace-nowrap">
                {formatNumber(item.value)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between border-t border-border dark:border-border pt-2 text-[10px] font-mono text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
