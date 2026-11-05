"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Link2, ArrowLeftRight, CornerDownLeft } from "lucide-react";
import { flattenNavItems, type NavItem } from "@/features/dashboard/nav";
import { api } from "@/lib/api-client";

type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void | Promise<void>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  isWorkspaceOwner?: boolean;
};

function matchesQuery(item: NavItem, q: string): boolean {
  const hay = `${item.label} ${item.href} ${(item.keywords || []).join(" ")}`.toLowerCase();
  return hay.includes(q);
}

export function CommandPalette({ open, onClose, isAdmin, isWorkspaceOwner }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchBusy, setSearchBusy] = useState(false);
  const [txHits, setTxHits] = useState<PaletteAction[]>([]);

  const navActions = useMemo(() => {
    return flattenNavItems()
      .filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.ownerOnly && !isWorkspaceOwner) return false;
        return true;
      })
      .map((item) => ({
        id: `nav-${item.href}`,
        label: item.label,
        hint: item.href.replace("/dashboard/", ""),
        icon: <item.icon className="h-4 w-4" />,
        run: () => {
          router.push(item.href);
          onClose();
        },
      }));
  }, [isAdmin, isWorkspaceOwner, onClose, router]);

  const staticActions = useMemo<PaletteAction[]>(
    () => [
      {
        id: "create-link",
        label: "Create payment link",
        hint: "payment-links",
        icon: <Link2 className="h-4 w-4" />,
        run: () => {
          router.push("/dashboard/payment-links?new=1");
          onClose();
        },
      },
      {
        id: "goto-txns",
        label: "Open transactions",
        hint: "collect",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        run: () => {
          router.push("/dashboard/transactions");
          onClose();
        },
      },
    ],
    [onClose, router]
  );

  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setTxHits([]);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.length < 4) {
      setTxHits([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setSearchBusy(true);
      try {
        const res = await api.getTransactions();
        if (cancelled) return;
        const needle = query.trim().toLowerCase();
        const rows = (res.transactions || [])
          .filter((tx) => {
            const hay = `${tx.id} ${tx.txid || ""} ${tx.paymentMethod || ""} ${tx.status}`.toLowerCase();
            return hay.includes(needle);
          })
          .slice(0, 8);
        setTxHits(
          rows.map((tx) => ({
            id: `tx-${tx.id}`,
            label: `${tx.txid || tx.id} · ${tx.status}`,
            hint: tx.paymentMethodTitle || tx.paymentMethod || "transaction",
            icon: <ArrowLeftRight className="h-4 w-4" />,
            run: () => {
              router.push(`/dashboard/transactions?id=${encodeURIComponent(tx.id)}`);
              onClose();
            },
          }))
        );
      } catch {
        if (!cancelled) setTxHits([]);
      } finally {
        if (!cancelled) setSearchBusy(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, q, query, onClose, router]);

  const filteredNav = useMemo(() => {
    if (!q) return navActions.slice(0, 10);
    return navActions.filter((a) => {
      const item = flattenNavItems().find((n) => `nav-${n.href}` === a.id);
      return item ? matchesQuery(item, q) : a.label.toLowerCase().includes(q);
    });
  }, [navActions, q]);

  const actions = useMemo(() => {
    const create = staticActions.filter((a) => !q || a.label.toLowerCase().includes(q));
    return [...create, ...txHits, ...filteredNav];
  }, [filteredNav, q, staticActions, txHits]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, txHits.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(actions.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = actions[activeIndex];
        if (action) void action.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, actions, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" className="absolute inset-0 bg-ink-solid/45" aria-label="Close palette" onClick={onClose} />
      <div className="relative mx-auto mt-[12vh] w-[min(560px,92vw)] overflow-hidden rounded-xl border border-border bg-surface shadow-overlay">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page, search TrxID / session, or create a link…"
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            aria-label="Command search"
          />
          {searchBusy ? <span className="text-[10px] font-mono text-muted">…</span> : null}
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {actions.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted">No matches. Try a page name or TrxID.</li>
          ) : (
            actions.map((action, index) => (
              <li key={action.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    index === activeIndex ? "bg-brand/10 text-ink" : "text-ink hover:bg-brand/5"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void action.run()}
                >
                  <span className="text-muted">{action.icon}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{action.label}</span>
                  {action.hint ? (
                    <span className="truncate font-mono text-[10px] text-muted">{action.hint}</span>
                  ) : null}
                  {index === activeIndex ? <CornerDownLeft className="h-3.5 w-3.5 text-muted" /> : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span className="font-mono">Ctrl/⌘ K</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}
