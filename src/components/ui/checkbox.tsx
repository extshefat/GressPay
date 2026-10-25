import * as React from "react";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, description, id, checked, disabled, onChange, ...props }, ref) => {
    const checkId = id || props.name || React.useId();

    return (
      <label
        htmlFor={checkId}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={checkId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
              checked
                ? "bg-teal-700 dark:bg-teal-500 border-teal-700 dark:border-teal-500 text-white dark:text-zinc-950"
                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500"
            }`}
          >
            {checked && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </div>

        {(label || description) && (
          <div className="text-xs">
            {label && <div className="font-medium text-zinc-900 dark:text-zinc-100">{label}</div>}
            {description && <div className="text-[11px] text-zinc-500 mt-0.5">{description}</div>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
