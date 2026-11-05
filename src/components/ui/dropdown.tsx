"use client";
import * as React from "react";
export interface DropdownItem {
    id?: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
    disabled?: boolean;
    divider?: boolean;
}
export interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: "left" | "right";
    className?: string;
}
export function Dropdown({ trigger, items, align = "right", className = "" }: DropdownProps) {
    const [open, setOpen] = React.useState(false);
    const root = React.useRef<HTMLDivElement>(null);
    const menu = React.useRef<HTMLDivElement>(null);
    const id = React.useId();
    const focusTrigger = () => root.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
    React.useEffect(() => { if (!open)
        return; menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node))
        setOpen(false); }; document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside); }, [open]);
    const triggerProps = { "aria-haspopup": "menu" as const, "aria-expanded": open, "aria-controls": id, onClick: () => setOpen(v => !v), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
        } }, };
    return <div ref={root} className={`relative inline-block ${className}`}>{React.isValidElement(trigger) ? React.cloneElement(trigger as React.ReactElement<React.HTMLAttributes<HTMLElement>>, triggerProps) : <button type="button" {...triggerProps}>{trigger}</button>}{open && <div id={id} ref={menu} role="menu" aria-label="Actions" className={`gp-surface absolute z-50 mt-2 min-w-48 p-2 ${align === "right" ? "right-0" : "left-0"}`} data-elevation="floating" onKeyDown={e => { const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        focusTrigger();
    }
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        buttons[e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
    else if (e.key === "Tab")
        setOpen(false); }}>{items.map((item, index) => item.divider ? <hr key={index} className="my-1 border-border"/> : <button key={item.id || index} type="button" role="menuitem" disabled={item.disabled} className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-surface-muted disabled:opacity-50 ${item.danger ? "text-danger" : "text-ink"}`} onClick={() => { item.onClick?.(); setOpen(false); focusTrigger(); }}>{item.icon}{item.label}</button>)}</div>}</div>;
}
