"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Building2, X } from "lucide-react";
import type { User } from "@/lib/types/api";

const DISMISS_KEY = "gresspay_no_brand_banner_dismissed";

export function NoBrandBanner({ user }: { user: User | null }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  if (!user || user.hasBrand || dismissed) return null;

  return (
    <Alert variant="warning" title="Create your first brand" className="relative mb-6 max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => {
          try {
            window.sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="absolute right-2 top-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted hover:bg-brand/5 hover:text-ink"
        aria-label="Dismiss brand prompt"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="pr-8 text-xs text-muted dark:text-ink">
        Your account is ready. Add a brand to configure gateways, devices, and checkout rails.
      </p>
      <div className="mt-3">
        <Link href="/dashboard/brands">
          <Button size="sm" variant="primary" leftIcon={<Building2 className="h-3.5 w-3.5" />}>
            Go to Brands
          </Button>
        </Link>
      </div>
    </Alert>
  );
}
