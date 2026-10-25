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
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  className = "",
  orientation = "vertical",
}) => {
  return (
    <div
      role="radiogroup"
      className={`flex ${orientation === "horizontal" ? "flex-row flex-wrap gap-4" : "flex-col gap-2.5"} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const optId = `${name}-${opt.value}`;

        return (
          <label
            key={opt.value}
            htmlFor={optId}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              opt.disabled ? "opacity-50 cursor-not-allowed" : ""
            } ${
              isSelected
                ? "border-teal-700 bg-teal-50/50 dark:border-teal-400 dark:bg-teal-950/20"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                id={optId}
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                disabled={opt.disabled}
                onChange={() => !opt.disabled && onChange(opt.value)}
                className="peer sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  isSelected
                    ? "border-teal-700 dark:border-teal-400 bg-white dark:bg-zinc-950 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500"
                    : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-teal-700 dark:bg-teal-400" />
                )}
              </div>
            </div>

            <div className="text-xs">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{opt.label}</div>
              {opt.description && (
                <div className="text-[11px] text-zinc-500 mt-0.5">{opt.description}</div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
};
