import * as React from "react";
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: React.ReactNode;
    description?: string;
    error?: string;
    hint?: string;
}
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ label, description, error, hint, id, className = "", ...props }, ref) => { const generated = React.useId(); const inputId = id || generated; const help = error || hint || description; return <div className={className}><label htmlFor={inputId} className={`inline-flex items-start gap-3 text-sm leading-relaxed ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}><input {...props} ref={ref} id={inputId} type="checkbox" aria-invalid={!!error} aria-describedby={help ? `${inputId}-hint` : undefined} className="mt-1 h-4 w-4 shrink-0 accent-brand"/>{label}</label>{help && <p id={`${inputId}-hint`} role={error ? "alert" : undefined} className={`ml-7 text-xs ${error ? "text-danger" : "text-muted"}`}>{help}</p>}</div>; });
Checkbox.displayName = "Checkbox";
