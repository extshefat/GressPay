import * as React from "react";
export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: "sm" | "md";
    className?: string;
    id?: string;
    error?: string;
    hint?: string;
}
export function Toggle({ checked, onChange, label, description, disabled = false, size = "md", className = "", id, error, hint }: ToggleProps) { const generated = React.useId(); const toggleId = id || generated; const help = error || hint || description; return <div className={`flex items-start justify-between gap-4 ${className}`}><div>{label && <label htmlFor={toggleId} className="block cursor-pointer text-sm font-medium">{label}</label>}{help && <p id={`${toggleId}-hint`} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>{help}</p>}</div><button id={toggleId} type="button" role="switch" aria-label={label || "Toggle setting"} aria-checked={checked} aria-describedby={help ? `${toggleId}-hint` : undefined} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex min-h-6 w-11 shrink-0 items-center rounded-full border border-border-strong p-0.5 transition-colors duration-150 disabled:opacity-50 ${checked ? "bg-brand" : "bg-surface-muted"} ${size === "sm" ? "scale-90" : ""}`}><span className={`h-5 w-5 rounded-full bg-on-brand shadow-raised transition-transform duration-150 ${checked ? "translate-x-4" : "translate-x-0"}`}/></button></div>; }
