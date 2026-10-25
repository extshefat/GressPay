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
          setError(err instanceof Error ? err.message : "Could not start checkout.");
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-teal-500/10 via-zinc-400/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-mono text-zinc-500 hover:text-teal-700 dark:hover:text-teal-400 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to GressPay
        </Link>
        <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[50%]">
          {session ? `SESSION ${session.sessionId}` : linkId}
        </span>
      </div>

      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Preparing checkout…</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg rounded-2xl border border-rose-300/50 bg-white dark:bg-zinc-950 p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-zinc-700 dark:text-zinc-200">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && session && <HostedCheckoutModal session={session} />}
    </div>
  );
}
