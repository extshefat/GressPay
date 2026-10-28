"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";
import { ArrowRight, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/fees", label: "Pricing" },
  { href: "/developers", label: "Developers" },
  { href: "/help", label: "Help" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

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

  const logout = () => {
    api.clearToken();
    setAuthed(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <GressPayLogo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "text-teal-700 dark:text-teal-400 font-medium" : "hover:text-zinc-900 dark:hover:text-white"}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle size="sm" />
          {authed ? (
            <>
              <Link href="/dashboard/overview">
                <Button variant="ghost" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                  Dashboard
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-300"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 space-y-3 bg-white dark:bg-zinc-950">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block text-sm" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <ThemeToggle size="sm" />
            {authed ? (
              <Link href="/dashboard/overview" className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full" size="sm">
                  Sign up
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
