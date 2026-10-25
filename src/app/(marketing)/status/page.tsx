import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function StatusPage() {
  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="space-y-3">
        <Badge variant="cyan" dot>
          Status
        </Badge>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Service status</h1>
        <p className="text-base text-slate-300 leading-relaxed">
          GressPay is the software on this host. There is no separate public uptime network or 99.9%
          SLA. Health is whatever this instance reports.
        </p>
      </div>

      <Card className="p-6 bg-void-card border-void-border/80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">This website</span>
          <span className="text-xs font-mono text-emerald-400">Reachable if you can read this</span>
        </div>
        <div className="flex items-center justify-between border-t border-void-border/60 pt-4">
          <span className="text-sm font-semibold text-white">REST API</span>
          <span className="text-xs font-mono text-slate-400">
            <code>/api/v1</code> on the same origin
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-void-border/60 pt-4">
          <span className="text-sm font-semibold text-white">Hosted checkout</span>
          <span className="text-xs font-mono text-slate-400">
            <code>/pay/&#123;linkOrInvoiceId&#125;</code>
          </span>
        </div>
      </Card>

      <p className="text-xs text-slate-400 leading-relaxed">
        Operators: check Docker / nginx and PHP-FPM on the VPS. Merchants: if checkout fails, confirm
        the method is enabled and a deposit number is set. See{" "}
        <Link href="/help" className="text-brand-cyan hover:underline">
          Help
        </Link>{" "}
        and the{" "}
        <Link href="/developers" className="text-brand-cyan hover:underline">
          API
        </Link>
        .
      </p>
    </div>
  );
}
