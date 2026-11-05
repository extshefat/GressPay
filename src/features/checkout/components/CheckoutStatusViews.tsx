"use client";

import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/ui/status-timeline";
import type { CheckoutSession } from "@/lib/types/api";

export function CheckoutCancelledView(props: {
  message: string;
  redirectUrl: string | null;
  redirectSec: number;
}) {
  return (
    <div className="gp-checkout-card mx-auto w-full max-w-lg space-y-4 p-8 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-ink">Checkout canceled</h2>
      <p className="text-sm text-muted">{props.message}</p>
      {props.redirectUrl && (
        <>
          <a href={props.redirectUrl} className="inline-block text-sm font-semibold text-accent underline">
            Return now
          </a>
          <p className="font-mono text-[11px] text-muted">Redirecting in {props.redirectSec}s…</p>
        </>
      )}
    </div>
  );
}

export function CheckoutFailedView(props: {
  refunded?: boolean;
  merchantName: string;
  sessionId: string;
  message?: string | null;
  returnUrl?: string | null;
}) {
  return (
    <section className="gp-checkout-card mx-auto max-w-lg space-y-3 p-8 text-center" role="alert" aria-live="assertive">
      <h2 className="text-xl font-semibold">{props.refunded ? "Payment refunded" : "Payment unsuccessful"}</h2>
      <p className="text-sm text-muted">
        {props.message || `Contact ${props.merchantName} with your order reference before sending another payment.`}
      </p>
      <p className="break-all font-mono text-xs text-muted">{props.sessionId}</p>
      {props.returnUrl ? (
        <a className="inline-block text-sm font-semibold text-accent underline" href={props.returnUrl}>
          Return to seller
        </a>
      ) : (
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      )}
    </section>
  );
}

export function CheckoutExpiredView(props: {
  message?: string | null;
  returnUrl?: string | null;
}) {
  return (
    <div className="gp-checkout-card mx-auto w-full max-w-lg space-y-4 p-8 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-ink">
        <Clock className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Session expired</p>
      <h2 className="text-xl font-semibold text-ink">Payment window ended</h2>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
        {props.message || "This payment session timed out. Ask the seller for a new checkout link before sending money again."}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          if (props.returnUrl) window.location.href = props.returnUrl;
          else window.location.reload();
        }}
      >
        {props.returnUrl ? "Return to seller" : "Reload status"}
      </Button>
    </div>
  );
}

export function CheckoutConfirmingExpiryView(props: { message?: string | null }) {
  return (
    <div className="gp-checkout-card mx-auto max-w-lg space-y-4 p-8 text-center" role="status" aria-live="polite">
      <h2 className="text-lg font-semibold">Confirming payment status</h2>
      <p className="text-sm text-muted">{props.message || "The server is checking whether this payment window has ended."}</p>
      <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
        Retry status
      </Button>
    </div>
  );
}

export function CheckoutWaitingSmsView(props: {
  message?: string | null;
  providerUrl?: string | null;
  pollingSeconds: number;
  txid?: string;
}) {
  return (
    <div className="gp-checkout-card mx-auto w-full max-w-lg space-y-5 p-8 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-transparent" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink">
          <RefreshCw className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Payment submitted</p>
        <h2 className="text-xl font-semibold text-ink">Waiting for confirmation</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
          {props.message ||
            "Your TrxID is registered. GressPay is matching the merchant companion SMS. Keep this page open."}
        </p>
      </div>
      <StatusTimeline
        events={[
          { id: "1", title: "TrxID submitted", status: "completed" },
          { id: "2", title: "Waiting for SMS match", status: "current", description: `${props.pollingSeconds}s elapsed` },
          { id: "3", title: "Order confirmed", status: "pending" },
        ]}
      />
      {props.txid && <p className="font-mono text-xs text-muted">TrxID · {props.txid}</p>}
      {props.providerUrl && (
        <a className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-semibold" href={props.providerUrl} target="_blank" rel="noopener noreferrer">
          Continue to Binance Pay ↗
        </a>
      )}
    </div>
  );
}

export function CheckoutSuccessView(props: {
  session: CheckoutSession;
  demoMode?: boolean;
  redirectCountdown: number;
}) {
  const target = props.session.successRedirectUrl || props.session.returnUrl;
  return (
    <div className="gp-checkout-card mx-auto w-full max-w-lg space-y-4 p-8 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-ink">
        {props.demoMode ? "Sample payment successful" : "Payment confirmed"}
      </h2>
      <p className="text-sm text-muted">
        {props.demoMode
          ? "This preview never moved money. Use a live payment link for real checkouts."
          : "Evidence matched. The merchant store has been notified."}
      </p>
      <p className="break-all font-mono text-xs text-muted">{props.session.sessionId}</p>
      {target && <p className="text-xs text-muted">Redirecting in {props.redirectCountdown}s…</p>}
      {target && (
        <a href={target} className="inline-block text-sm font-semibold text-accent underline">
          Continue now
        </a>
      )}
    </div>
  );
}
