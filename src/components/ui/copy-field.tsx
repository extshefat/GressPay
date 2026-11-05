"use client";
import * as React from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { IconButton } from "./icon-button";
export interface CopyFieldProps {
    value: string;
    label?: string;
    masked?: boolean;
    canUnmask?: boolean;
    className?: string;
}
export function CopyField({ value, label, masked = false, canUnmask = false, className = "" }: CopyFieldProps) { const [copied, setCopied] = React.useState(false); const [isMasked, setMasked] = React.useState(masked); const [error, setError] = React.useState(""); const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined); React.useEffect(() => () => clearTimeout(timer.current), []); React.useEffect(() => setMasked(masked), [masked]); async function copy() { setError(""); try {
    await navigator.clipboard.writeText(value);
    setCopied(true);
}
catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    }
    catch { /* Fall back to manual copy. */ }
    finally {
        field.remove();
    }
    if (!ok) {
        setError('Copy unavailable. Select the value and copy manually.');
        return;
    }
    setCopied(true);
} clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2000); } return <div className={className}>{label && <p className="mb-2 text-sm font-medium">{label}</p>}<div className="flex min-w-0 items-center gap-2 rounded-md border border-border-strong bg-surface p-2"><code className="min-w-0 flex-1 truncate px-1 text-xs select-all">{isMasked ? "•".repeat(Math.min(value.length, 28)) : value}</code>{canUnmask && <IconButton label={isMasked ? "Show value" : "Hide value"} size="sm" onClick={() => setMasked(v => !v)}>{isMasked ? <Eye size={16}/> : <EyeOff size={16}/>}</IconButton>}<IconButton label={copied ? "Copied" : "Copy value"} size="sm" onClick={copy}>{copied ? <Check size={16}/> : <Copy size={16}/>}</IconButton></div><p role="status" className={`mt-1 min-h-4 text-xs ${error ? "text-danger" : "text-muted"}`}>{error || (copied ? "Copied to clipboard." : "")}</p></div>; }
