"use client";

import { Suspense } from "react";
import { AuthCard } from "@/features/auth/AuthCard";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-xs text-zinc-500 dark:bg-black">
          Loading…
        </div>
      }
    >
      <AuthCard initialTab="signin" />
    </Suspense>
  );
}
