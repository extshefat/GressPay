import React from "react";

export interface GpMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/** Color mark on light backgrounds, white mark on dark backgrounds. */
export const GpMark: React.FC<GpMarkProps> = ({ size = "md", className = "" }) => {
  const box = `${sizeClass[size]} object-contain shrink-0 ${className}`;
  return (
    <span className="inline-flex shrink-0" aria-hidden>
      <img src="/brand/gresspay-mark-color.png" alt="" className={`${box} dark:hidden`} />
      <img src="/brand/gresspay-mark-white.png" alt="" className={`${box} hidden dark:block`} />
    </span>
  );
};
