import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function StatusPage() {
  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 transition-colors">
      <div className="space-y-3">
        <Badge variant="cyan" dot>
          Status
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight">Service status</h1>
        <p className="text-sm sm:text-base text-muted dark:text-muted leading-relaxed">
          GressPay is the software on this host. There is no separate public uptime network or 99.9%
          SLA. Health is whatever this instance reports.
        </p>
      </div>

      <Card className="p-6 border-border dark:border-border bg-white dark:bg-surface/60 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink dark:text-ink">This website</span>
          <span className="text-xs font-mono text-success dark:text-success">Reachable if you can read this</span>
        </div>
        <div className="flex items-center justify-between border-t border-border dark:border-border pt-4">
          <span className="text-sm font-semibold text-ink dark:text-ink">REST API</span>
          <span className="text-xs font-mono text-muted">
            <code>/api/v1</code> on the same origin
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border dark:border-border pt-4">
          <span className="text-sm font-semibold text-ink dark:text-ink">Hosted checkout</span>
          <span className="text-xs font-mono text-muted">
            <code>/pay/&#123;linkOrInvoiceId&#125;</code>
          </span>
        </div>
      </Card>

      <p className="text-xs text-muted leading-relaxed">
        Operators: check Docker / nginx and PHP-FPM on the VPS. Account holders: if checkout fails, confirm
        the method is enabled and a deposit number is set. See{" "}
        <Link href="/help" className="text-accent dark:text-accent font-medium hover:underline">
          Help
        </Link>{" "}
        and the{" "}
        <Link href="/developers" className="text-accent dark:text-accent font-medium hover:underline">
          API docs
        </Link>
        .
      </p>
    </div>
  );
}
