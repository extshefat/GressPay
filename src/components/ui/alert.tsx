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
      icon: <Info className="w-4 h-4 text-accent dark:text-accent shrink-0 mt-0.5" />,
      style:
        "bg-accent/10 border-accent dark:bg-brand/30 dark:border-accent/50 text-accent dark:text-accent",
      titleColor: "text-accent dark:text-accent",
    },
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-success dark:text-success shrink-0 mt-0.5" />,
      style:
        "bg-success/10 border-success dark:bg-success/30 dark:border-success/50 text-success dark:text-success",
      titleColor: "text-success dark:text-success",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-warning dark:text-warning shrink-0 mt-0.5" />,
      style:
        "bg-warning/10 border-warning dark:bg-warning/30 dark:border-warning/50 text-warning dark:text-warning",
      titleColor: "text-warning dark:text-warning",
    },
    danger: {
      icon: <AlertCircle className="w-4 h-4 text-danger dark:text-danger shrink-0 mt-0.5" />,
      style:
        "bg-danger/10 border-danger dark:bg-danger/30 dark:border-danger/50 text-danger dark:text-danger",
      titleColor: "text-danger dark:text-danger",
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
