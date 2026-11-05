import React from "react";
import { Badge } from "@/components/ui/badge";

export default function SecurityPage() {
  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 transition-colors">
      <div className="space-y-3">
        <Badge variant="emerald">Security</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink dark:text-ink tracking-tight">Security notes</h1>
        <p className="text-xs text-muted font-mono">How this GressPay instance authenticates and signs events</p>
      </div>

      <div className="space-y-6 text-sm text-muted dark:text-muted leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink dark:text-ink">API secrets</h2>
          <p>
            Live keys start with <code className="font-mono text-accent dark:text-accent">gp_live_</code>. Test keys
            start with <code className="font-mono text-accent dark:text-accent">gp_test_</code>. Only a prefix is
            shown after creation. The full secret is stored hashed. Rotate website keys from Dashboard → Brands.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink dark:text-ink">Dashboard sessions</h2>
          <p>
            Sign-in issues a JWT for your account. The dashboard sends it as Bearer and, when you switch Live /
            Test, adds <code className="font-mono text-ink dark:text-ink">X-GressPay-Mode</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink dark:text-ink">Webhooks</h2>
          <p>
            Paid events POST JSON to your URL with{" "}
            <code className="font-mono text-ink dark:text-ink">X-GressPay-Signature</code> = HMAC-SHA256 of the
            raw body using your webhook secret. Verify before you fulfill an order.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-ink dark:text-ink">What we do not store</h2>
          <p>
            No card PANs, CVVs, or 3-D Secure payloads. Checkout collects customer name / contact and
            a transaction ID for the rail you enabled.
          </p>
        </section>
      </div>
    </div>
  );
}
