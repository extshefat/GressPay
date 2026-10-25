"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: "right" | "left";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  position = "right",
  size = "md",
  className = "",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const posStyles = {
    right: "right-0 inset-y-0",
    left: "left-0 inset-y-0",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`fixed ${posStyles[position]} flex max-w-full`}>
        <div
          className={`w-screen ${sizeStyles[size]} bg-white dark:bg-zinc-950 border-${position === "right" ? "l" : "r"} border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-${position === "right" ? "right" : "left"} duration-300 ${className}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <div className="space-y-1">
              {title && (
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-zinc-700 dark:text-zinc-300">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
