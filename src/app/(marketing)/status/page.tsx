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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Service status</h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          GressPay is the software on this host. There is no separate public uptime network or 99.9%
          SLA. Health is whatever this instance reports.
        </p>
      </div>

      <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">This website</span>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">Reachable if you can read this</span>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">REST API</span>
          <span className="text-xs font-mono text-zinc-500">
            <code>/api/v1</code> on the same origin
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hosted checkout</span>
          <span className="text-xs font-mono text-zinc-500">
            <code>/pay/&#123;linkOrInvoiceId&#125;</code>
          </span>
        </div>
      </Card>

      <p className="text-xs text-zinc-500 leading-relaxed">
        Operators: check Docker / nginx and PHP-FPM on the VPS. Account holders: if checkout fails, confirm
        the method is enabled and a deposit number is set. See{" "}
        <Link href="/help" className="text-teal-700 dark:text-teal-400 font-medium hover:underline">
          Help
        </Link>{" "}
        and the{" "}
        <Link href="/developers" className="text-teal-700 dark:text-teal-400 font-medium hover:underline">
          API docs
        </Link>
        .
      </p>
    </div>
  );
}
