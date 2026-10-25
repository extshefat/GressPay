"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastMessage, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, type = "info", duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type, duration }]);
    },
    []
  );

  const success = useCallback(
    (message: string, title?: string) => toast({ title, message, type: "success" }),
    [toast]
  );
  const error = useCallback(
    (message: string, title?: string) => toast({ title, message, type: "error" }),
    [toast]
  );
  const warning = useCallback(
    (message: string, title?: string) => toast({ title, message, type: "warning" }),
    [toast]
  );
  const info = useCallback(
    (message: string, title?: string) => toast({ title, message, type: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-[#077C74] dark:text-[#1BD1C0] shrink-0" />,
  };

  const borders = {
    success: "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-zinc-950/90",
    error: "border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-zinc-950/90",
    warning: "border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-zinc-950/90",
    info: "border-teal-200 dark:border-teal-900/60 bg-teal-50/90 dark:bg-zinc-950/90",
  };

  const currentType = item.type || "info";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${borders[currentType]}`}
    >
      {icons[currentType]}
      <div className="flex-1 min-w-0 pt-0.5">
        {item.title && (
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
            {item.title}
          </h4>
        )}
        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
          {item.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5 rounded"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback when outside provider
    return {
      toast: () => {},
      success: (msg: string) => console.log("[Toast success]:", msg),
      error: (msg: string) => console.error("[Toast error]:", msg),
      warning: (msg: string) => console.warn("[Toast warning]:", msg),
      info: (msg: string) => console.info("[Toast info]:", msg),
      dismiss: () => {},
    };
  }
  return context;
}
