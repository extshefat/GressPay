"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import type { User } from "@/lib/types/api";

export function NoBrandBanner({ user }: { user: User | null }) {
  if (!user || user.hasBrand) return null;

  return (
    <Alert variant="warning" title="Create your first brand" className="mb-6 max-w-7xl mx-auto">
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        Your account is ready. Add a brand when you want to configure gateways, devices, and checkout rails.
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
