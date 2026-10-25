import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, helperText, options, children, id, disabled, ...props }, ref) => {
    const selectId = id || props.name || React.useId();

    return (
      <div className="space-y-1.5 w-full text-left">
        {label ? (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        ) : null}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={`flex h-10 w-full appearance-none rounded-xl border bg-white dark:bg-zinc-950 px-3 py-2 pr-9 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:border-teal-600 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-600/20 dark:focus:ring-teal-400/20 ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
                : "border-zinc-200 dark:border-zinc-800"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        </div>

        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
