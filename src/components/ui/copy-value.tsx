"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { IconButton } from "./icon-button";

/** A fully visible address/amount, with an explicit acknowledgement after a real copy. */
export function CopyValue({ label, value, displayValue, hint }: { label: string; value: string; displayValue?: string; hint?: string }) {
  const [message, setMessage] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    let copied = false;
    try { await navigator.clipboard.writeText(value); copied = true; }
    catch {
      const previous = document.activeElement as HTMLElement | null;
      const input = document.createElement("textarea");
      input.value = value; input.style.position = "fixed"; input.style.opacity = "0";
      document.body.append(input); input.select();
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      finally { input.remove(); previous?.focus({ preventScroll: true }); }
    }
    setMessage(copied ? "Copied" : "Select the value and copy manually.");
    clearTimeout(timer.current); timer.current = setTimeout(() => setMessage(""), 3000);
  }
  return <div className="relative min-w-0 rounded-md border border-border-strong bg-card p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 select-all break-all font-mono text-lg font-semibold leading-7 tabular-nums text-ink">{displayValue || value}</p></div><IconButton label={`Copy ${label.toLowerCase()}`} variant="secondary" size="sm" onClick={copy}>{message === "Copied" ? <Check size={16}/> : <Copy size={16}/>}</IconButton></div>
    {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
    <span role="status" className="pointer-events-none absolute right-4 top-14 text-xs text-accent">{message === "Copied" ? "Copied" : ""}</span>{message && message !== "Copied" && <p role="alert" className="mt-2 text-xs text-danger">{message}</p>}
  </div>;
}
