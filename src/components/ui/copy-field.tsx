"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { IconButton } from "./icon-button";

export interface CopyFieldProps {
  value: string;
  label?: string;
  masked?: boolean;
  canUnmask?: boolean;
  className?: string;
}

export function CopyField({
  value,
  label,
  masked = false,
  canUnmask = false,
  className = "",
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const [isMasked, setIsMasked] = useState(masked);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayValue = isMasked ? "•".repeat(Math.min(value.length, 28)) : value;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center rounded-xl border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60 px-3 py-2">
        <span className="flex-1 font-mono text-xs text-zinc-800 dark:text-zinc-200 truncate select-all">
          {displayValue}
        </span>

        <div className="flex items-center gap-1 pl-2">
          {canUnmask && (
            <IconButton
              size="xs"
              variant="ghost"
              label={isMasked ? "Show secret" : "Hide secret"}
              aria-label={isMasked ? "Show secret" : "Hide secret"}
              onClick={() => setIsMasked(!isMasked)}
            >
              {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </IconButton>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
              copied
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
