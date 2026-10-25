import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || React.useId();

    return (
      <div className="space-y-1.5 w-full text-left">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        ) : null}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`flex h-10 w-full rounded-xl border bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-teal-600 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-600/20 dark:focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50 ${
              leftIcon ? "pl-9" : ""
            } ${rightIcon ? "pr-9" : ""} ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
                : "border-zinc-200 dark:border-zinc-800"
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-zinc-400 dark:text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-[11px] text-zinc-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
