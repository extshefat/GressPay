"use client";

import React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    danger: (
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ),
    warning: (
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ),
    info: (
      <div className="w-10 h-10 rounded-full bg-teal-100 text-[#077C74] dark:bg-teal-950/50 dark:text-[#1BD1C0] flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" />
      </div>
    ),
  };

  const buttonVariant = variant === "danger" ? "danger" : "primary";

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          {iconMap[variant]}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
