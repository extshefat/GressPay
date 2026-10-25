import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}) => {
  const config = {
    info: {
      icon: <Info className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />,
      style:
        "bg-teal-50/70 border-teal-200 dark:bg-teal-950/30 dark:border-teal-900/50 text-teal-950 dark:text-teal-100",
      titleColor: "text-teal-900 dark:text-teal-200",
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
      style:
        "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100",
      titleColor: "text-emerald-900 dark:text-emerald-200",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
      style:
        "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 text-amber-950 dark:text-amber-100",
      titleColor: "text-amber-900 dark:text-amber-200",
    },
    danger: {
      icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,
      style:
        "bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-900/50 text-red-950 dark:text-red-100",
      titleColor: "text-red-900 dark:text-red-200",
    },
  };

  const curr = config[variant];

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-colors ${curr.style} ${className}`}
    >
      {curr.icon}
      <div className="flex-1 text-left">
        {title && <h5 className={`font-semibold mb-0.5 ${curr.titleColor}`}>{title}</h5>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
