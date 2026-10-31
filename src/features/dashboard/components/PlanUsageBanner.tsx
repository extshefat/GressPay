"use client";

import React from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PlanUsage } from "@/lib/types/api";
import { ArrowRight, Crown } from "lucide-react";

type Props = {
  usage: PlanUsage | null | undefined;
  className?: string;
};

export function PlanUsageBanner({ usage, className = "" }: Props) {
  if (!usage) return null;

  const { monthlyCompleted, brands } = usage;
  const atTxnLimit = monthlyCompleted.atLimit;
  const warnTxn = monthlyCompleted.warning && !atTxnLimit;
  const atBrandLimit = brands.atLimit;

  if (!atTxnLimit && !warnTxn && !atBrandLimit) {
    return null;
  }

  if (atTxnLimit) {
    const limit = monthlyCompleted.limit ?? 50;
    return (
      <Alert variant="danger" className={className}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            Your account reached its limit of {limit} completed checkouts for {usage.billingMonthLabel}. New
            checkout sessions are blocked until you upgrade or the next billing month starts.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="primary" rightIcon={<Crown className="w-4 h-4" />}>
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
    return (
      <Alert variant="warning" className={className}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            You have used {monthlyCompleted.used} of {limit} completed checkouts this month ({usage.billingMonthLabel}
            ). About {remaining} remaining on your current plan.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View plans
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  if (atBrandLimit && brands.limit <= 1) {
    return (
      <Alert variant="warning" className={className}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm">
            Your account is on Trial or Starter (1 website). Upgrade to add more websites to your account.
          </p>
          <Link href="/fees">
            <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Upgrade account
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return null;
}
