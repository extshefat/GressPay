"use client";
import * as React from "react";
export type Elevation = "flat" | "raised" | "floating" | "overlay";
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    elevation?: Elevation;
}
export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, interactive = false, elevation = "raised", className = "", onKeyDown, ...props }, ref) => <div ref={ref} data-elevation={elevation} className={`gp-surface ${interactive ? "transition-shadow hover:shadow-floating" : ""} ${className}`} role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined} onKeyDown={event => { onKeyDown?.(event); if (interactive && event.target === event.currentTarget && !event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.currentTarget.click();
} }} {...props}>{children}</div>);
Card.displayName = "Card";
export const Surface = Card;
export const ElevatedSurface = Card;
