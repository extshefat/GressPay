import React from "react";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name = "", src, size = "md", className = "" }: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase() || "GP";
  };

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-medium overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-[#077C74]/10 text-[#077C74] dark:bg-[#1BD1C0]/15 dark:text-[#1BD1C0] shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || "Avatar"} className="w-full h-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
