"use client";
import * as React from "react";
export interface AvatarProps {
    name?: string;
    src?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
}
export function Avatar({ name = "", src, size = "md", className = "" }: AvatarProps) { const [failed, setFailed] = React.useState(false); React.useEffect(() => setFailed(false), [src]); const words = name.trim().split(/\s+/); const initials = words.length > 1 ? words.slice(0, 2).map(word => Array.from(word)[0]).join("") : Array.from(name).slice(0, 2).join(""); const sizes = { xs: "h-6 w-6 text-xs", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base", xl: "h-16 w-16 text-xl" }; return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-accent/10 font-medium text-accent ${sizes[size]} ${className}`} aria-label={name || "Account"}>{src && !failed ? <img src={src} onError={() => setFailed(true)} alt="" className="h-full w-full object-cover"/> : <span aria-hidden>{initials.toUpperCase() || "GP"}</span>}</span>; }
