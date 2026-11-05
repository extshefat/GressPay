"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";
import { nav } from "@/content/marketing";
import { ArrowRight, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api
      .getMe()
      .then(() => alive && setAuthed(true))
      .catch(() => alive && setAuthed(false));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previously = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previously?.focus?.();
    };
  }, [open]);

  const logout = async () => {
    await api.clearToken();
    setAuthed(false);
    router.push("/");
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b border-border bg-canvas/90 backdrop-blur-md transition-[box-shadow] duration-200 ease-precision ${
        scrolled ? "shadow-raised" : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-on-brand"
      >
        Skip to content
      </a>
      <div className="gp-container flex h-16 items-center justify-between gap-4" data-width="marketing">
        <Link href="/" className="flex items-center" aria-label="GressPay home">
          <GressPayLogo size="sm" />
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted md:flex" aria-label="Primary">
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "text-accent" : "transition hover:text-ink"}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle size="sm" />
          {authed ? (
            <>
              <Link href="/dashboard/overview">
                <Button type="button" variant="ghost" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                  Dashboard
                </Button>
              </Link>
              <Button type="button" variant="secondary" size="sm" onClick={logout} leftIcon={<LogOut className="h-4 w-4" />}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href={nav.secondaryCta.href}>
                <Button type="button" variant="ghost" size="sm">
                  {nav.secondaryCta.label}
                </Button>
              </Link>
              <Link href={nav.primaryCta.href}>
                <Button type="button" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  {nav.primaryCta.label}
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-muted md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls={panelId}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile menu">
          <button type="button" className="absolute inset-0 bg-ink-solid/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div
            id={panelId}
            ref={panelRef}
            className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col gap-4 border-l border-border bg-card p-5 shadow-overlay"
          >
            <div className="flex items-center justify-between">
              <GressPayLogo size="sm" />
              <button ref={closeRef} type="button" className="rounded-md p-2" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {nav.links.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-surface" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 border-t border-border pt-4">
              <ThemeToggle size="sm" />
              {authed ? (
                <Link href="/dashboard/overview" onClick={() => setOpen(false)}>
                  <Button type="button" className="w-full" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href={nav.primaryCta.href} onClick={() => setOpen(false)}>
                  <Button type="button" className="w-full" size="sm">
                    {nav.primaryCta.label}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
