import React from "react";

export interface GpMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  inverse?: boolean;
}

const sizeClass = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/** Color mark on light backgrounds, white mark on dark backgrounds. */
export const GpMark: React.FC<GpMarkProps> = ({ size = "md", className = "", inverse = false }) => {
  const box = `${sizeClass[size]} object-contain shrink-0 ${className}`;
  if (inverse) {
    return (
      <span className="inline-flex shrink-0" aria-hidden>
        <img src="/brand/gresspay-mark-white.png" alt="" className={box} />
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0" aria-hidden>
      <img src="/brand/gresspay-mark-white.png" alt="" className={`${box} brightness-0 dark:hidden`} />
      <img src="/brand/gresspay-mark-white.png" alt="" className={`${box} hidden dark:block`} />
    </span>
  );
};
