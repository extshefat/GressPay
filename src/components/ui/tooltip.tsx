"use client";
import * as React from "react";
export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    className?: string;
}
export function Tooltip({ content, children, position = "top", className = "" }: TooltipProps) { const [visible, setVisible] = React.useState(false); const id = React.useId(); const positions = { top: "bottom-full left-1/2 -translate-x-1/2 mb-2", bottom: "top-full left-1/2 -translate-x-1/2 mt-2", left: "right-full top-1/2 -translate-y-1/2 mr-2", right: "left-full top-1/2 -translate-y-1/2 ml-2" }; return <span className={`relative inline-flex ${className}`} onPointerEnter={() => setVisible(true)} onPointerLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)} onKeyDown={e => { if (e.key === "Escape")
    setVisible(false); }}>{React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { "aria-describedby": visible ? id : undefined }) : children}{visible && <span id={id} role="tooltip" className={`gp-tooltip absolute z-50 w-max ${positions[position]}`}>{content}</span>}</span>; }
