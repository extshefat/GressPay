import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-700/25 rounded-xl active:scale-[0.98]";

  const sizeStyles = {
    sm: "text-xs min-h-9 px-3.5 py-2 gap-1.5",
    md: "text-sm min-h-10 px-4 py-2.5 gap-2",
    lg: "text-sm min-h-11 px-5 py-3 gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-300 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.14)]",
    secondary:
      "bg-white text-zinc-800 hover:bg-zinc-50 dark:bg-[#242424] dark:text-zinc-100 dark:hover:bg-[#303030] border border-zinc-200 dark:border-[#414141] shadow-sm",
    outline:
      "bg-white/70 text-zinc-800 dark:bg-transparent dark:text-zinc-100 border border-zinc-300 dark:border-[#414141] hover:bg-zinc-50 dark:hover:bg-[#242424]",
    ghost:
      "bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_4px_12px_rgba(225,29,72,0.16)]",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_12px_rgba(5,150,105,0.16)]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
