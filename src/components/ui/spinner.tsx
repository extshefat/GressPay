import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({ size = "md", className = "", label }: SpinnerProps) {
  const sizeMap = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <Loader2
        className={`animate-spin text-[#077C74] dark:text-[#1BD1C0] ${sizeMap[size]} ${className}`}
      />
      {label && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
