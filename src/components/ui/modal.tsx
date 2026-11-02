"use client";

import * as React from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#101010]/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-[#414141] dark:bg-[#1c1c1c] sm:p-6">
        {title ? <h2 className="mb-4 text-lg font-bold tracking-tight">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
