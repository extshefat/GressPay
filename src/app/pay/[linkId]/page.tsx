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
      if (!linkId) return;
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to GressPay</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[50%]">
          {session ? `SESSION ${session.sessionId}` : linkId}
        </span>
      </div>

      {loading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Initializing checkout session…</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-700 dark:text-zinc-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Unable to Open Checkout
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            variant="outline"
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