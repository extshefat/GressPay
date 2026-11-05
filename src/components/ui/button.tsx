import * as React from "react";
import { Spinner } from "./spinner";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({children,variant="primary",size="md",isLoading=false,leftIcon,rightIcon,iconOnly=false,className="",disabled,type="submit",...props},ref) => {
  const sizes={sm:"min-h-9 px-3 text-xs",md:"min-h-11 px-4 text-sm",lg:"min-h-12 px-5 text-base"};
  return <button ref={ref} type={type} data-variant={variant} aria-busy={isLoading || undefined} disabled={disabled || isLoading} className={`gp-button ${sizes[size]} ${iconOnly ? "aspect-square !px-2" : ""} ${className}`} {...props}>
    {isLoading ? <Spinner size="sm" label=""/> : leftIcon}{children}{!isLoading && rightIcon}
  </button>;
});
Button.displayName="Button";
