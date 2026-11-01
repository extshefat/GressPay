"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HostedCheckoutModal } from "@/features/checkout/components/HostedCheckoutModal";
import { api } from "@/lib/api-client";
import { CheckoutSession } from "@/lib/types/api";
import { ThemeToggle } from "@/lib/theme";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black py-8 px-4 sm:px-6 flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-md mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="text-xs font-medium text-zinc-500 hover:text-teal-800 dark:hover:text-teal-300 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>GressPay</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[55%] text-right">
          {session ? session.sessionId : linkId}
        </span>
      </div>

      {loading && (
        <div className="py-20 text-center space-y-3" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto dark:border-teal-400 dark:border-t-transparent" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Preparing secure checkout…</p>
          <p className="text-[11px] text-zinc-400">Payment is confirmed only after verification — not by this screen alone.</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Unable to open checkout
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && session && <HostedCheckoutModal session={session} />}
    </div>
  );
}