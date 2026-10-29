"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";
import { ArrowRight, Mail, ShieldCheck, User } from "lucide-react";

type Tab = "signin" | "signup";

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function AuthCard({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    router.replace(next === "signup" ? "/register" : "/login");
  };

  const google = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/callback/google`;
      const res = await api.getGoogleAuthUrl(redirectUri);
      if (res.enabled && res.url) {
        window.location.href = res.url;
        return;
      }
      setError(res.reason || "Google sign-in is not configured on this server.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === "signup") {
        await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: name.trim(),
        });
      } else {
        await api.login(email.trim(), password);
      }
      router.push("/dashboard/overview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 selection:bg-teal-500/20 dark:bg-zinc-950">
      <div className="absolute right-5 top-5">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Link href="/" className="mb-2 inline-flex items-center justify-center">
            <GressPayLogo variant="auto" size="lg" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {tab === "signup" ? "Create your account" : "Sign in to GressPay"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Bangladesh payment verification for the wallets you configure.
          </p>
        </div>

        <Card className="border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="space-y-4">
            {error && (
              <Alert variant="danger" title="Authentication notice">
                {error}
              </Alert>
            )}

            <button
              type="button"
              onClick={google}
              disabled={googleBusy}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
            >
              <GoogleMark />
              <span>{googleBusy ? "Connecting to Google…" : "Continue with Google"}</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
              <span className="mx-3 flex-shrink font-mono text-[11px] uppercase text-zinc-400">
                or use email
              </span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === "signin" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === "signup" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500"}`}
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
                minLength={tab === "signup" ? 8 : 1}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
              />
              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full"
                isLoading={busy}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </div>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          Funds stay in the wallets you configure.
        </p>
      </div>
    </div>
  );
}
