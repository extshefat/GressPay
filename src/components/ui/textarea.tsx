import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, hint, helperText = hint, id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = React.useId();
    const areaId = id || props.name || generatedId;

    return (
      <div className="space-y-1.5 w-full text-left">
        {label ? (
          <label
            htmlFor={areaId}
            className="block text-xs font-semibold text-ink dark:text-ink tracking-wide"
          >
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        ) : null}

        <textarea
          id={areaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
            aria-describedby={error ? `${areaId}-error` : helperText ? `${areaId}-helper` : undefined}
          className={`gp-control resize-y ${className}`}
          {...props}
        />

        {error ? (
          <p id={`${areaId}-error`} role="alert" className="text-xs text-danger dark:text-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${areaId}-helper`} className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
