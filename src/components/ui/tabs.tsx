"use client";
import * as React from "react";
export function Tabs({ tabs, value, onChange }: {
    tabs: {
        id: string;
        label: string;
    }[];
    value: string;
    onChange: (id: string) => void;
}) { const root = React.useRef<HTMLDivElement>(null); return <div ref={root} role="tablist" aria-label="Sections" className="dashboard-tabs" onKeyDown={e => { const index = tabs.findIndex(t => t.id === value); let next = index; if (e.key === "ArrowRight")
    next = (index + 1) % tabs.length;
else if (e.key === "ArrowLeft")
    next = (index - 1 + tabs.length) % tabs.length;
else if (e.key === "Home")
    next = 0;
else if (e.key === "End")
    next = tabs.length - 1;
else
    return; e.preventDefault(); onChange(tabs[next].id); root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus(); }}>{tabs.map(tab => <button key={tab.id} role="tab" aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} type="button" className={`dashboard-tab ${value === tab.id ? "dashboard-tab-active" : ""}`} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</div>; }
