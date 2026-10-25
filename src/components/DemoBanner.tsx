"use client";

import React from "react";
import { DATA_SOURCE } from "@/lib/api-client";

/** Persistent chrome when the UI is not wired to a live API — never looks like real money. */
export function DemoBanner() {
  if (DATA_SOURCE === "live") return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 text-center text-xs sm:text-sm font-semibold tracking-wide px-3 py-2"
    >
      DEMO DATA — not live payments. Set{" "}
      <code className="font-mono bg-amber-600/30 px-1 rounded">NEXT_PUBLIC_DATA_SOURCE=live</code> to use the
      real API. Mock verify never proves a real payment.
    </div>
  );
}
