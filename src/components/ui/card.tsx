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
    ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    : "";

  return (
    <div
      className={`bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-colors ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
