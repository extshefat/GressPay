import * as React from "react";
export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    className?: string;
}
export function EmptyState({ icon, title, description, action, secondaryAction, className = "" }: EmptyStateProps) { return <div className={`flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface p-6 text-center sm:p-10 ${className}`}><div className="mb-4 text-accent">{icon || <svg width="96" height="64" viewBox="0 0 96 64" fill="none" aria-hidden="true"><path d="M18 17h54l9 13v25H9V30l9-13Z" fill="var(--bg-card)" stroke="currentColor" strokeWidth="1.5"/><path d="M9 30h23l5 9h22l5-9h17M24 10h48M30 4h36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 58h62" stroke="var(--border-color)" strokeWidth="3" strokeLinecap="round"/></svg>}</div><h3 className="text-lg font-semibold">{title}</h3>{description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}{(action || secondaryAction) && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}{secondaryAction}</div>}</div>; }
