"use client";

import React from "react";
import Image from "next/image";
import { GpMark } from "./GpMark";

export interface GressPayLogoProps {
  variant?: "auto" | "color" | "white" | "symbol" | "app-icon";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export function GressPayLogo({
  variant = "auto",
  size = "md",
  showText = true,
  className = "",
}: GressPayLogoProps) {
  const sizeMap = {
    sm: { mark: "sm" as const, h: 24, text: "text-base" },
    md: { mark: "md" as const, h: 32, text: "text-lg" },
    lg: { mark: "lg" as const, h: 40, text: "text-2xl" },
    xl: { mark: "lg" as const, h: 52, text: "text-3xl" },
  };

  const currentSize = sizeMap[size];

  if (variant === "app-icon") {
    const dim = size === "sm" ? 24 : size === "md" ? 36 : size === "lg" ? 48 : 64;
    return (
      <div
        className={`inline-flex rounded-xl overflow-hidden shadow-xs border border-zinc-200/50 dark:border-zinc-800 shrink-0 ${className}`}
      >
        <Image
          src="/brand/gresspay-app-icon.png"
          alt="GressPay App Icon"
          width={dim}
          height={dim}
          className="object-cover"
        />
      </div>
    );
  }

  if (variant === "symbol") {
    return <GpMark size={currentSize.mark} className={className} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <GpMark size={currentSize.mark} />
      {showText && (
        <span
          className={`font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans ${currentSize.text}`}
        >
          GressPay
        </span>
      )}
    </div>
  );
}
