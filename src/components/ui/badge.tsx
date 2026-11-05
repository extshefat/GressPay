import * as React from "react";
export interface BadgeProps {
    children: React.ReactNode;
    variant?: "cyan" | "emerald" | "amber" | "rose" | "slate" | "purple" | "default" | "success" | "warning" | "danger" | "info";
    size?: "sm" | "md";
    className?: string;
    dot?: boolean;
}
const colors = { default: "bg-surface-muted text-ink border-border", slate: "bg-surface-muted text-ink border-border", cyan: "bg-accent/10 text-accent border-accent/30", purple: "bg-accent/10 text-accent border-accent/30", emerald: "bg-success/10 text-success border-success/30", success: "bg-success/10 text-success border-success/30", amber: "bg-warning/10 text-warning border-warning/30", warning: "bg-warning/10 text-warning border-warning/30", rose: "bg-danger/10 text-danger border-danger/30", danger: "bg-danger/10 text-danger border-danger/30", info: "bg-info/10 text-info border-info/30" };
export function Badge({ children, variant = "default", size = "md", className = "", dot = false }: BadgeProps) { return <span className={`inline-flex items-center gap-1.5 rounded-sm border font-medium ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"} ${colors[variant]} ${className}`}>{dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current"/>}{children}</span>; }
