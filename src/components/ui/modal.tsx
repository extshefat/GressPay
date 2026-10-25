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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-zinc-950/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        {title ? <h2 className="mb-3 text-lg font-semibold">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
