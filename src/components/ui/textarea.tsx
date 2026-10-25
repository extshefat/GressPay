import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, helperText, id, disabled, rows = 3, ...props }, ref) => {
    const areaId = id || props.name || React.useId();

    return (
      <div className="space-y-1.5 w-full text-left">
        {label ? (
          <label
            htmlFor={areaId}
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        ) : null}

        <textarea
          id={areaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={`flex w-full rounded-xl border bg-white dark:bg-zinc-950 p-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-teal-600 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-600/20 dark:focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
              : "border-zinc-200 dark:border-zinc-800"
          } ${className}`}
          {...props}
        />

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

Textarea.displayName = "Textarea";
