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
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className = "",
  id,
}) => {
  const toggleId = id || React.useId();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  const isSmall = size === "sm";

  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      {(label || description) && (
        <div className="text-left">
          {label && (
            <label
              htmlFor={toggleId}
              className={`text-xs font-semibold block text-zinc-900 dark:text-zinc-100 ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      )}

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          isSmall ? "h-5 w-9" : "h-6 w-11"
        } ${checked ? "bg-teal-700 dark:bg-teal-500" : "bg-zinc-200 dark:bg-zinc-800"}`}
      >
        <span
          className={`pointer-events-none inline-block rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out ${
            isSmall ? "h-4 w-4 mt-0.5" : "h-5 w-5 mt-0.5"
          } ${checked ? (isSmall ? "translate-x-4 ml-0.5" : "translate-x-5 ml-0.5") : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
};
