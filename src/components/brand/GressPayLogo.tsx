"use client";

import React from "react";

export interface GressPayLogoProps {
  variant?: "auto" | "color" | "white" | "symbol" | "app-icon";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const heightClass = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
  xl: "h-14",
};

export function GressPayLogo({
  variant = "auto",
  size = "md",
  className = "",
}: GressPayLogoProps) {
  const h = heightClass[size];

  if (variant === "app-icon") {
    const dim = size === "sm" ? 28 : size === "md" ? 40 : size === "lg" ? 52 : 64;
    return (
      <img
        src="/brand/gresspay-app-icon.png"
        alt="GressPay"
        width={dim}
        height={dim}
        className={`object-contain shrink-0 ${className}`}
      />
    );
  }

  if (variant === "symbol") {
    const dim = size === "sm" ? 28 : size === "md" ? 36 : size === "lg" ? 44 : 56;
    return (
      <span className={`inline-flex shrink-0 ${className}`}>
        <img
          src="/brand/gresspay-mark-color.png"
          alt="GressPay"
          width={dim}
          height={dim}
          className="object-contain dark:hidden"
        />
        <img
          src="/brand/gresspay-mark-white.png"
          alt=""
          width={dim}
          height={dim}
          className="hidden object-contain dark:block"
        />
      </span>
    );
  }

  if (variant === "white") {
    return (
      <img
        src="/brand/gresspay-lockup-white.png"
        alt="GressPay"
        className={`${h} w-auto object-contain ${className}`}
      />
    );
  }

  if (variant === "color") {
    return (
      <img
        src="/brand/gresspay-lockup-color.png"
        alt="GressPay"
        className={`${h} w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/brand/gresspay-lockup-color.png"
        alt="GressPay"
        className={`${h} w-auto object-contain dark:hidden`}
      />
      <img
        src="/brand/gresspay-lockup-white.png"
        alt="GressPay"
        className={`${h} w-auto object-contain hidden dark:block`}
      />
    </span>
  );
}
