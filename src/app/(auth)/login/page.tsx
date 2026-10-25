"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { Tooltip } from "@/components/ui/tooltip";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ThemeToggle } from "@/lib/theme";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { ArrowRight, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth state
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getAuthProviders()
      .then((data) => {
        if (alive && data.google) {
          setGoogleEnabled(data.google.enabled);
        }
      })
      .catch(() => {
        // Fallback: disabled
        if (alive) setGoogleEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      success("Logged in successfully. Redirecting to merchant dashboard...", "Welcome Back");
      router.push("/dashboard/overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid email or password credentials.";
      setError(msg);
      toastError(msg, "Authentication Failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleEnabled) return;
    setIsGoogleLoading(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/callback/google`;
      const res = await api.getGoogleAuthUrl(redirectUri);
      if (res.enabled && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.reason || "Google OAuth is not enabled on this platform.");
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate Google OAuth.";
      setError(msg);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative selection:bg-teal-500/20">
      {/* Top Controls */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center mb-2">
            <GressPayLogo variant="auto" size="lg" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sign in to Merchant Portal
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage your bKash, Nagad, Binance Pay & USDT TRC-20 settlements
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="danger" title="Authentication Error">
                {error}
              </Alert>
            )}

            <Input
              label="Merchant Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <PasswordInput
              label="Account Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <Checkbox
                label="Remember this device"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Link
                href="/help"
                className="text-xs text-teal-700 hover:text-teal-800 dark:text-[#1BD1C0] dark:hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in to Dashboard
            </Button>

            {/* Google OAuth Option */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
                <span className="flex-shrink mx-3 text-[11px] font-mono text-zinc-400 uppercase">
                  or
                </span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
              </div>

              {googleEnabled ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-semibold text-zinc-800 dark:text-zinc-100 shadow-2xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isGoogleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
                </button>
              ) : (
                <Tooltip
                  content="Google OAuth is optional platform configuration. To enable, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Coolify environment variables."
                  position="top"
                  className="w-full"
                >
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs font-medium text-zinc-400 cursor-not-allowed opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google (Platform Setup Required)</span>
                  </button>
                </Tooltip>
              )}
            </div>
          </form>
        </Card>

        {/* Footer info */}
        <div className="text-center space-y-2 text-xs text-zinc-500">
          <p>
            Don&apos;t have a merchant account?{" "}
            <Link
              href="/register"
              className="text-[#077C74] font-medium hover:underline dark:text-[#1BD1C0]"
            >
              Open Merchant Account →
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
            <Lock className="w-3 h-3" />
            <span>256-bit TLS Encrypted • Isolated Sandbox Environment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
