import * as React from "react";
export interface RadioOption {
    value: string;
    label: React.ReactNode;
    description?: string;
    disabled?: boolean;
}
export interface RadioGroupProps {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: RadioOption[];
    className?: string;
    orientation?: "horizontal" | "vertical";
    label?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
}
export function RadioGroup({ name, value, onChange, options, className = "", orientation = "vertical", label, hint, error, disabled }: RadioGroupProps) { const id = React.useId(); return <div role="radiogroup" aria-label={label || name} aria-describedby={hint || error ? `${id}-hint` : undefined} aria-invalid={!!error} className={className}><div className={`flex gap-3 ${orientation === "horizontal" ? "flex-wrap" : "flex-col"}`}>{options.map(option => <label key={option.value} className={`gp-surface flex items-start gap-3 p-3 text-sm ${disabled || option.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><input type="radio" className="mt-1 h-4 w-4 accent-brand" name={name} value={option.value} checked={value === option.value} disabled={disabled || option.disabled} onChange={() => onChange(option.value)}/><span><span className="block font-medium">{option.label}</span>{option.description && <span className="block text-xs text-muted">{option.description}</span>}</span></label>)}</div>{(hint || error) && <p id={`${id}-hint`} role={error ? "alert" : undefined} className={`mt-2 text-xs ${error ? "text-danger" : "text-muted"}`}>{error || hint}</p>}</div>; }
export const Radio = RadioGroup;
