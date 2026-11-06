"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PlanUsage } from "@/lib/types/api";
import { ArrowRight, Crown, X } from "lucide-react";

type Props = {
  usage: PlanUsage | null | undefined;
  className?: string;
};

const DISMISS_KEY = "gresspay_plan_banner_dismissed";

export function PlanUsageBanner({ usage, className = "" }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DISMISS_KEY);
      if (!raw || !usage) return;
      const parsed = JSON.parse(raw) as { month?: string; kind?: string };
      if (parsed.month === usage.billingMonthLabel) setDismissed(true);
    } catch {
      /* ignore */
    }
  }, [usage]);

  if (!usage || dismissed) return null;

  const { monthlyCompleted, brands } = usage;
  const atTxnLimit = monthlyCompleted.atLimit;
  const warnTxn = monthlyCompleted.warning && !atTxnLimit;
  const atBrandLimit = brands.atLimit;

  if (!atTxnLimit && !warnTxn && !atBrandLimit) {
    return null;
  }

  const dismiss = (kind: string) => {
    try {
      window.sessionStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ month: usage.billingMonthLabel, kind })
      );
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const shell = (kind: string, node: React.ReactNode) => (
    <div className={`relative ${className}`}>
      {node}
      {!atTxnLimit ? (
        <button
          type="button"
          onClick={() => dismiss(kind)}
          className="absolute right-2 top-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted hover:bg-brand/5 hover:text-ink"
          aria-label="Dismiss plan notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );

  if (atTxnLimit) {
    const limit = monthlyCompleted.limit ?? 50;
    return shell(
      "txn-limit",
      <Alert variant="danger" title="Checkout limit reached">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You used all {limit} completed checkouts for {usage.billingMonthLabel}. New sessions stay
            blocked until you upgrade or the next billing month starts.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="primary" rightIcon={<Crown className="h-4 w-4" />}>
              Upgrade account
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  if (warnTxn) {
    const limit = monthlyCompleted.limit ?? 50;
    const remaining = Math.max(0, limit - monthlyCompleted.used);
    return shell(
      "txn-warn",
      <Alert variant="warning" title="Approaching monthly limit">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            {monthlyCompleted.used} of {limit} completed checkouts used in {usage.billingMonthLabel}
            . About {remaining} remain on your current plan.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View plans
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  // WS-03: show whenever brands.atLimit (not only Trial/Starter limit === 1).
  if (atBrandLimit) {
    return shell(
      "brand-limit",
      <Alert variant="warning" title="Brand limit">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            You are using {brands.used} of {brands.limit} brand
            {brands.limit === 1 ? "" : "s"} on your plan. Upgrade to add another website workspace.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Upgrade account
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return null;
}
