import * as React from "react";
export function Container({ children, width = "marketing", className = "", ...props }: React.HTMLAttributes<HTMLDivElement> & {
    width?: "marketing" | "dashboard";
}) { return <div className={`gp-container ${className}`} data-width={width} {...props}>{children}</div>; }
export function Section({ children, className = "", ...props }: React.HTMLAttributes<HTMLElement>) { return <section className={`gp-section ${className}`} {...props}>{children}</section>; }
export function SectionHeader({ title, description, kicker, actions, className = "" }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    kicker?: string;
    actions?: React.ReactNode;
    className?: string;
}) { return <header className={`mb-6 flex flex-wrap items-end justify-between gap-4 ${className}`}><div>{kicker && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{kicker}</p>}<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}</div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</header>; }
export function Kbd({ children, className = "", ...props }: React.HTMLAttributes<HTMLElement>) { return <kbd className={`gp-kbd ${className}`} {...props}>{children}</kbd>; }
