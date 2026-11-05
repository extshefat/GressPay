"use client";

import { Suspense } from "react";
import { AuthCard } from "@/features/auth/AuthCard";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-card text-xs text-muted dark:bg-black">
          Loading…
        </div>
      }
    >
      <AuthCard initialTab="signin" />
    </Suspense>
  );
}
