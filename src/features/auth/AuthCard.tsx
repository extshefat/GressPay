"use client";
import { GOOGLE_COLORS } from "@/lib/design/tokens";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { afterSignIn } from "./team-invite";
import { api } from "@/lib/api-client";
import { ArrowRight, Mail, ShieldCheck, User } from "lucide-react";

type Tab = "signin" | "signup";

function homeFor(
  user: { role?: string; isAdmin?: boolean } | undefined,
  plan?: string | null
) {
  localStorage.removeItem("gresspay_selected_plan");
  const base = user?.role === "admin" || user?.isAdmin ? "/dashboard/admin" : "/dashboard/overview";
  if (plan && plan !== "trial") {
    return "/dashboard/my-payments?plan=" + encodeURIComponent(plan);
  }
  return base;
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill={GOOGLE_COLORS[0]} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill={GOOGLE_COLORS[1]} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill={GOOGLE_COLORS[2]} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill={GOOGLE_COLORS[3]} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function AuthCard({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (planParam) {
      try {
        localStorage.setItem("gresspay_selected_plan", planParam);
      } catch {
        /* ignore */
      }
    }
  }, [planParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!await api.hydrateSessionFromCookie() || cancelled) return;
        const me = await api.getMe();
        if (cancelled || !me?.user) return;
        const plan =
          planParam ||
          (typeof window !== "undefined"
            ? localStorage.getItem("gresspay_selected_plan")
            : null);
        router.replace(afterSignIn(homeFor(me.user, plan)));
      } catch {
        /* not logged in */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planParam, router]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    const q = planParam ? `?plan=${encodeURIComponent(planParam)}` : "";
    router.replace(next === "signup" ? `/register${q}` : `/login${q}`);
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      if (planParam) {
        localStorage.setItem("gresspay_selected_plan", planParam);
      }
      sessionStorage.setItem("gresspay_oauth_remember", rememberMe ? "1" : "0");
      const redirectUri = `${window.location.origin}/callback/google`;
      const res = await api.getGoogleAuthUrl(redirectUri, AbortSignal.timeout(20000));
      if (res.enabled && res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.reason || "Google sign-in is not configured on this server.");
    } catch (err: unknown) {
      const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0;
      const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code || "") : "";
      if (status === 502 || code === "PHP_UNREACHABLE" || code === "PHP_GATEWAY" || code === "PHP_TIMEOUT") {
        setError(
          "Google sign-in could not reach the GressPay API (502). Wait 10s and retry. If it keeps failing: Coolify → php container must be Running, web env GRESSPAY_PHP_URL=http://php:8080, then Redeploy. Check /api/ops/php-reachability"
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const selectedPlan =
        planParam ||
        (typeof window !== "undefined"
          ? localStorage.getItem("gresspay_selected_plan")
          : null);
      const res = tab === "signup"
        ? await api.register({
            name: name.trim(),
            email: email.trim(),
            password,
            businessName: name.trim(),
            rememberMe,
          })
        : await api.login(email.trim(), password, rememberMe);
      router.replace(afterSignIn(homeFor(res.user, selectedPlan)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-card via-white to-surface p-4 sm:p-6 selection:bg-brand/15 dark:from-canvas dark:via-black dark:to-canvas">
      <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2.5 text-center">
          <Link href="/" className="mb-1 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg">
            <GressPayLogo variant="auto" size="lg" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
            {tab === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted dark:text-muted">
            Access your brands, payment links and receipts.
          </p>
          {planParam && (
            <p className="text-[11px] font-mono text-accent dark:text-accent">
              Selected plan: <span className="font-bold uppercase">{planParam}</span>
            </p>
          )}
        </div>

        <Card className="border-border bg-white/95 p-6 shadow-lg shadow-zinc-900/5  dark:border-border dark:bg-canvas/90 sm:p-8">
          <div className="space-y-4">
            {error && (
              <Alert variant="danger" title="Could not continue">
                {error}
              </Alert>
            )}

            <button
              type="button"
              onClick={google}
              disabled={googleBusy}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-70 dark:border-border dark:bg-surface dark:text-ink dark:hover:bg-ink-solid/80"
            >
              <GoogleMark />
              <span>{googleBusy ? "Connecting to Google…" : "Continue with Google"}</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-border dark:border-border" />
              <span className="mx-3 flex-shrink font-mono text-[11px] uppercase tracking-wide text-muted">
                or email
              </span>
              <div className="flex-grow border-t border-border dark:border-border" />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 dark:bg-surface">
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${tab === "signin" ? "bg-white text-ink shadow-sm dark:bg-surface-muted dark:text-ink" : "text-muted hover:text-ink dark:hover:text-on-ink"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${tab === "signup" ? "bg-white text-ink shadow-sm dark:bg-surface-muted dark:text-ink" : "text-muted hover:text-ink dark:hover:text-on-ink"}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {tab === "signup" && (
                <Input
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  leftIcon={<User className="h-4 w-4" />}
                  required
                  autoComplete="name"
                />
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                leftIcon={<Mail className="h-4 w-4" />}
                required
                autoComplete="email"
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={tab === "signup" ? 10 : 1}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
              />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted dark:text-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent/40"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device (7 days)</span>
              </label>
              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                variant="primary"
                isLoading={busy}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </div>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-muted dark:text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-accent dark:text-accent" />
          Funds stay in the wallets you configure.
        </p>
      </div>
    </div>
  );
}
