"use client";
import * as React from "react";
import { DialogFrame } from "./dialog-frame";
import { Button } from "./button";
import { Alert } from "./alert";
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
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "danger", loading = false }: ConfirmDialogProps) { return <DialogFrame open={open} onClose={() => { if (!loading)
    onClose(); }} title={title} footer={<div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button><Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} isLoading={loading}>{confirmLabel}</Button></div>}><Alert variant={variant}>{description}</Alert></DialogFrame>; }
