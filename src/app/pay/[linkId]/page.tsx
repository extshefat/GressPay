"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { HostedCheckoutModal } from "@/features/checkout/components/HostedCheckoutModal";
import { api } from "@/lib/api-client";
import { CheckoutSession } from "@/lib/types/api";
import { ThemeToggle } from "@/lib/theme";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const params = useParams<{ linkId: string }>();
  const linkId = params?.linkId || "";
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!linkId) {
        setError("Invalid checkout link.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api.initCheckout(linkId);
        if (alive) setSession(data);
      } catch (err: unknown) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Could not start checkout session.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [linkId]);

  return (
    <div className="gp-checkout-shell relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle size="sm" />
      </div>

      {loading && (
        <div className="space-y-3 py-20 text-center" role="status" aria-live="polite">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent dark:border-teal-400 dark:border-t-transparent" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preparing secure checkout…</p>
          <p className="text-[11px] text-zinc-500">
            Payment is confirmed only after verification — not by this screen alone.
          </p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg space-y-4 rounded-3xl border border-zinc-200/80 bg-white/95 p-8 text-center shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Unable to open checkout</h1>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{error}</p>
          </div>
          <Button variant="primary" size="sm" className="w-full" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && session && <HostedCheckoutModal session={session} />}
    </div>
  );
}
