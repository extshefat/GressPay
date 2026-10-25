import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  label: string;
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      variant = "ghost",
      size = "md",
      label,
      isLoading = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      xs: "w-7 h-7 text-xs",
      sm: "w-8 h-8 text-sm",
      md: "w-9 h-9 text-base",
      lg: "w-11 h-11 text-lg",
    };

    const variantStyles = {
      primary:
        "bg-teal-700 text-white hover:bg-teal-600 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400 shadow-sm",
      secondary:
        "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700/80",
      outline:
        "bg-transparent text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70",
      ghost:
        "bg-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
      danger:
        "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50",
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:scale-[0.98] ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
