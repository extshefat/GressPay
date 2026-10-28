"use client";

import React, { useEffect, useState } from "react";
import { DATA_SOURCE } from "@/lib/api-client";

/** Persistent banner when running with mock data and not authenticated. */
export function DemoBanner() {
  const [hasAuth, setHasAuth] = useState(true);

  useEffect(() => {
    setHasAuth(Boolean(localStorage.getItem("gresspay_jwt")));
    const onAuth = () => setHasAuth(Boolean(localStorage.getItem("gresspay_jwt")));
    window.addEventListener("storage", onAuth);
    return () => window.removeEventListener("storage", onAuth);
  }, []);

  if (DATA_SOURCE !== "mock" || hasAuth) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] w-full bg-zinc-900 text-white border-b border-zinc-800 text-center text-xs font-semibold tracking-wide px-3 py-1.5"
    >
      DEMO MODE — viewing mock preview. Sign in to connect to your live database.
    </div>
  );
}
