"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";

type Tab = "signin" | "signup";

export function AuthCard({ initialTab }: { initialTab: Tab }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let alive = true;
    api
      .getAuthProviders()
      .then((data) => {
        if (alive) setGoogleEnabled(Boolean(data.google?.enabled));
      })
      .catch(() => {
        if (alive) setGoogleEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const goDashboard = () => {
    router.push("/dashboard/overview");
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
        if (name.trim() === "" || email.trim() === "" || password.length < 8) {
          setError("Full name, email, and a password of at least 8 characters are required.");
          return;
        }
        await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: name.trim(),
        });
      } else {
        await api.login(email.trim(), password);
      }
      goDashboard();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white p-4 text-zinc-950 dark:bg-black dark:text-white">
      <div className="absolute right-4 top-4">
        <ThemeToggle size="sm" />
      </div>
      <div className="w-full max-w-md border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/" className="mb-6 inline-flex">
          <GressPayLogo size="md" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{tab === "signup" ? "Sign up" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A workspace is created from your name. No separate merchant application.
        </p>

        <button
          type="button"
          onClick={google}
          disabled={googleBusy || !googleEnabled}
          className="mt-6 flex h-12 w-full items-center justify-center border border-zinc-950 bg-zinc-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
        >
          {googleBusy ? "Connecting…" : "Continue with Google"}
        </button>
        {!googleEnabled && (
          <p className="mt-2 text-xs text-zinc-500">Google sign-in is not configured on this server yet.</p>
        )}

        <div className="my-6 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`flex-1 border px-3 py-2 ${tab === "signin" ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`flex-1 border px-3 py-2 ${tab === "signup" ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-black" : "border-zinc-300 dark:border-zinc-700"}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <label className="block text-xs font-medium">
              Full Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-white"
              />
            </label>
          )}
          <label className="block text-xs font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-white"
            />
          </label>
          <label className="block text-xs font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === "signup" ? 8 : 1}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-black dark:text-white"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full border border-zinc-950 text-sm font-semibold disabled:opacity-60 dark:border-white"
          >
            {busy ? "Please wait…" : tab === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
