import React from "react";

export interface GpMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

/** Teal GP mark — brand signal used in nav, footer, auth, dashboard. */
export const GpMark: React.FC<GpMarkProps> = ({ size = "md", className = "" }) => {
  return (
    <div
      className={`${sizeClass[size]} rounded-lg bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950 flex items-center justify-center font-bold shadow-sm ${className}`}
    >
      GP
    </div>
  );
};
