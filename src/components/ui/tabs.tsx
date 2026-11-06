"use client";
import * as React from "react";

export interface TabOption { id: string; label: React.ReactNode; disabled?: boolean; }
export function Tabs({ tabs, value, onChange, label = "Sections", variant = "line", panelId, id, className = "" }: {
  tabs: TabOption[]; value: string; onChange: (id: string) => void;
  label?: string; variant?: "line" | "cards"; panelId?: string; id?: string; className?: string;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const generated = React.useId();
  const prefix = id || generated;
  return <div ref={root} role="tablist" aria-label={label} className={`${variant === "cards" ? "grid grid-cols-2 gap-2" : "dashboard-tabs"} ${className}`} onKeyDown={event => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const enabled = tabs.filter(tab => !tab.disabled);
    if (!enabled.length) return;
    const index = enabled.findIndex(tab => tab.id === value);
    const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : (index + (event.key === "ArrowLeft" ? -1 : 1) + enabled.length) % enabled.length;
    event.preventDefault(); onChange(enabled[next].id);
    document.getElementById(`${prefix}-${enabled[next].id}`)?.focus();
  }}>
    {tabs.map(tab => <button key={tab.id} id={`${prefix}-${tab.id}`} role="tab" aria-controls={panelId} aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} disabled={tab.disabled} type="button" onClick={() => onChange(tab.id)} className={variant === "cards"
      ? `min-h-20 min-w-0 rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed ${value === tab.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border-strong bg-card hover:bg-surface disabled:bg-surface"}`
      : `dashboard-tab ${value === tab.id ? "dashboard-tab-active" : ""}`}>
      {tab.label}
    </button>)}
  </div>;
}
