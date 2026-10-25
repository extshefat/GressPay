"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function processOAuth() {
      if (errorParam) {
        if (alive) {
          setStatus("error");
          setErrorMessage(
            errorDescription || `Google authentication was cancelled or rejected (${errorParam}).`
          );
        }
        return;
      }

      if (!code || !state) {
        if (alive) {
          setStatus("error");
          setErrorMessage("Missing authorization code or state parameter from Google.");
        }
        return;
      }

      try {
        const res = await api.handleGoogleCallback({ code, state });
        if (alive) {
          setStatus("success");
          setTimeout(() => {
            if (res.user?.role === "admin" || res.user?.isAdmin) {
              router.push("/dashboard/admin");
            } else if (res.isNew) {
              router.push("/dashboard/methods?onboarding=1");
            } else {
              router.push("/dashboard/overview");
            }
          }, 1000);
        }
      } catch (err: unknown) {
        if (alive) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to complete Google authentication."
          );
        }
      }
    }

    processOAuth();

    return () => {
      alive = false;
    };
  }, [code, state, errorParam, errorDescription, router]);

  return (
    <Card className="p-8 max-w-md w-full text-center space-y-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl">
      <Link href="/" className="inline-flex items-center justify-center mb-2">
        <GressPayLogo variant="auto" size="md" />
      </Link>

      {status === "processing" && (
        <div className="py-8 space-y-3">
          <Spinner size="lg" className="mx-auto" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Verifying Google Account
          </h2>
          <p className="text-xs text-zinc-500">
            Completing OpenID Connect token exchange and linking your merchant profile…
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Authenticated Successfully
          </h2>
          <p className="text-xs text-zinc-500">Redirecting to your console…</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 text-left">
          <Alert variant="danger" title="Authentication Error">
            {errorMessage}
          </Alert>
          <div className="pt-2 text-center">
            <Link href="/login">
              <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="text-center text-xs text-zinc-500">
            <Spinner size="md" className="mx-auto mb-2" />
            Loading authentication handler…
          </div>
        }
      >
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
