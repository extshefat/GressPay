"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Lock, WifiOff, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { gatewayLogoPath } from "@/lib/gateway-library";
import type { CheckoutSession } from "@/lib/types/api";
import { isMobileMethod, resolveCheckoutPhase } from "../checkoutMachine";
import { useCheckout, type CheckoutPreviewSeed } from "../hooks/useCheckout";
import { CheckoutMethodPicker } from "./CheckoutMethodPicker";
import { CheckoutPayerDetails } from "./CheckoutPayerDetails";
import { CheckoutPaymentDetails } from "./CheckoutPaymentDetails";
import { CheckoutSummary } from "./CheckoutSummary";
import { CheckoutVerificationForm } from "./CheckoutVerificationForm";
import { CheckoutCancelledView, CheckoutExpiredView, CheckoutFailedView, CheckoutSuccessView } from "./CheckoutStatusViews";

export interface HostedCheckoutModalProps {
  session: CheckoutSession;
  /** Explicit, labeled preview only. Never calls payment APIs or simulates live settlement. */
  demoMode?: boolean;
  /** QA-only initial presentation; ignored for live checkouts. */
  previewSeed?: CheckoutPreviewSeed;
}

export function HostedCheckoutModal({ session, demoMode = false, previewSeed }: HostedCheckoutModalProps) {
  const checkout = useCheckout(session, demoMode, previewSeed);
  const [cancelOpen, setCancelOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const phase = resolveCheckoutPhase({ checkoutStatus: checkout.status, methodChosen: !!checkout.method, step: checkout.step, isPollingVerification: checkout.submitted, isVerifying: checkout.busy, cancelMessage: checkout.cancelled, secondsLeft: checkout.secondsLeft, smsAuto: checkout.smsAuto });
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [checkout.step, phase]);
  const terminal = ["success", "cancelled", "expired", "failed", "refunded"].includes(phase);
  const theme = session.checkoutTheme === "luxury" ? "gp-theme-luxury" : session.checkoutTheme === "minimal" ? "gp-theme-minimal" : "gp-theme-default";
  const title = phase === "waiting_sms" ? "Waiting for the payment SMS" : phase === "submitted_verifying" ? checkout.busy ? "Submitting your payment" : "Checking your payment" : phase === "success" ? "Payment confirmed" : phase === "cancelled" ? "Checkout cancelled" : phase === "expired" ? "Payment window ended" : phase === "failed" ? "Payment unsuccessful" : phase === "refunded" ? "Payment refunded" : phase === "confirming_expiry" ? "Checking payment status" : !session.availableMethods.length ? "Payment methods unavailable" : checkout.step === "choose" ? "Choose how to pay" : checkout.step === "payer" ? isMobileMethod(checkout.method) ? "Your payment number" : "Your details" : checkout.step === "verify" && !checkout.submitted ? "Verify your payment" : `Pay with ${checkout.method?.name || "your chosen method"}`;

  function back() {
    if (checkout.busy || checkout.submitted) return;
    checkout.setStep(checkout.step === "verify" ? "payment" : checkout.step === "payment" && (isMobileMethod(checkout.method) || !!session.customFields?.length) ? "payer" : "choose");
  }
  return <section className={`gp-checkout-flow mx-auto w-full overflow-hidden rounded-xl border border-border bg-card shadow-floating ${theme}`} aria-label="Hosted checkout" data-checkout-phase={phase}>
    <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); void checkout.cancel(); }} title="Cancel this checkout?" description="This closes the payment window for this order. If you have already paid, keep your receipt and contact the merchant." confirmLabel="Cancel checkout" cancelLabel="Keep checkout open" loading={checkout.cancelBusy}/>
    <CheckoutSummary session={session} method={checkout.step === "choose" ? undefined : checkout.method} secondsLeft={checkout.secondsLeft} demoMode={demoMode} phase={phase}/>
    <div className="min-w-0 p-5 sm:p-7">
      <header className="mb-6"><div className="mb-5 flex min-h-9 items-center justify-between gap-3"><div className="flex items-center gap-3">{checkout.step !== "choose" && !terminal && <IconButton label="Go back a step" variant="secondary" size="sm" disabled={checkout.busy || checkout.submitted} onClick={back}><ArrowLeft size={16}/></IconButton>}<span className="text-xs font-medium text-muted">{terminal ? "Payment receipt" : checkout.step === "choose" ? "Payment method" : checkout.step === "payer" ? "Before you pay" : "Complete your payment"}</span></div>{!terminal && <IconButton label="Cancel checkout" size="sm" variant="ghost" disabled={checkout.busy || checkout.cancelBusy} onClick={() => setCancelOpen(true)}><X size={18}/></IconButton>}</div>
        {checkout.method && checkout.step !== "choose" && !terminal && <div className="mb-4 flex items-center gap-3"><span className="inline-flex h-12 w-20 items-center justify-center rounded-md border border-border bg-on-ink p-2"><Image src={gatewayLogoPath(checkout.method.code)} alt="" width={64} height={36} className="h-9 w-16 object-contain" unoptimized/></span><span className="min-w-0 text-xs leading-5 text-muted">{checkout.method.accountType ? `${checkout.method.accountType} account` : checkout.method.code === "usdt_trc20" ? "TRON · TRC-20" : "Merchant payment method"}</span></div>}
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight focus-visible:outline-none">{title}</h2>
        {checkout.step === "choose" && <p className="mt-3 text-sm leading-6 text-muted">Choose a category, then a method. Receiving details and payment instructions come next.</p>}
      </header>
      <div className="space-y-5">
        {!checkout.online && <Alert variant="warning" title="You are offline">Your payment details are still here. Reconnect to submit a reference or check confirmation.</Alert>}
        {checkout.error && <Alert variant="danger" title="Could not continue">{checkout.error}</Alert>}
        {phase === "success" ? <CheckoutSuccessView hideHeading session={session} demoMode={demoMode} redirectCountdown={checkout.redirectSeconds} redirectUrl={checkout.redirectTarget} redirectActive={!!checkout.redirectTarget} method={checkout.method} txid={checkout.txid}/>
          : phase === "cancelled" ? <CheckoutCancelledView hideHeading message={checkout.cancelled || "Checkout cancelled."} redirectUrl={checkout.redirectTarget} redirectSec={checkout.redirectSeconds}/>
          : phase === "expired" ? <CheckoutExpiredView hideHeading message={checkout.message} returnUrl={session.returnUrl}/>
          : phase === "failed" || phase === "refunded" ? <CheckoutFailedView hideHeading refunded={phase === "refunded"} merchantName={session.merchantName} sessionId={session.sessionId} message={checkout.message} returnUrl={session.returnUrl}/>
          : phase === "confirming_expiry" ? <section className="space-y-4 rounded-lg border border-border bg-surface p-5"><h3 className="font-semibold">Checking the final payment status</h3><p role="status" className="text-sm leading-7 text-muted">{checkout.message || "The payment window has ended. Checking with the server before changing the order status; do not pay again."}</p><Button type="button" variant="secondary" onClick={checkout.retryStatus} disabled={!checkout.online}>Retry status check</Button></section>
          : !session.availableMethods.length ? <p className="rounded-lg border border-border bg-surface p-5 text-sm leading-7 text-muted">No connected payment methods are available. Contact {session.merchantName} for another way to pay.</p>
          : checkout.step === "choose" ? <CheckoutMethodPicker session={session} onChoose={checkout.choose}/>
          : checkout.step === "payer" ? <CheckoutPayerDetails session={session} checkout={checkout}/>
          : checkout.method ? <CheckoutPaymentDetails session={session} checkout={checkout} demoMode={demoMode}>{checkout.step === "verify" && !checkout.submitted && <CheckoutVerificationForm checkout={checkout} demoMode={demoMode}/>}</CheckoutPaymentDetails> : null}
      </div>
      <footer className="mt-7 border-t border-border pt-4"><p className="flex items-center gap-2 text-xs leading-6 text-muted"><Lock size={14} aria-hidden className="shrink-0 text-accent"/>GressPay confirms live payments only from server-side evidence.</p></footer>
    </div>
  </section>;
}
