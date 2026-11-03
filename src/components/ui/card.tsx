import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = "",
  ...props
}) => {
  const interactiveStyles = interactive
    ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-700/30 hover:shadow-lg cursor-pointer"
    : "";

  return (
    <div
      className={`bg-white/95 dark:bg-[#101821]/95 border border-[#d8dee5] dark:border-[#273341] rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_30px_rgba(16,24,40,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.14)] transition-colors ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
