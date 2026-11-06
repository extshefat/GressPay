"use client";
import { useEffect, useState } from "react";
import { HostedCheckoutModal } from "@/features/checkout/components/HostedCheckoutModal";
import { ThemeToggle } from "@/lib/theme";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { Select } from "@/components/ui/select";
import type { CheckoutSession, PaymentMethod } from "@/lib/types/api";
import type { CheckoutPreviewSeed } from "@/features/checkout/hooks/useCheckout";

const VIEWS = [
  { value: "choose", label: "1. Categories & payment methods" },
  { value: "payer", label: "2. Your payment number" },
  { value: "payment", label: "3. Receiving details & timer" },
  { value: "verify", label: "4. Transaction reference" },
  { value: "submitted", label: "5. Server verification" },
  { value: "waiting_sms", label: "6. Waiting for SMS evidence" },
  { value: "success", label: "Confirmed receipt" },
  { value: "expired", label: "Expired" },
  { value: "confirming", label: "Final status check" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "empty", label: "No connected methods" },
];
function makeMethod(code: string, name: string, crypto = false): PaymentMethod {
  return {
    code, name, country: crypto ? "GLOBAL" : "BD", category: crypto ? "crypto" : "mfs", logo: gatewayLogoPath(code),
    currency: crypto ? "USDT" : "BDT", feePercentage: 0, fixedFee: 0, minAmount: 1, maxAmount: 100000,
    isEnabled: true, isAutomated: true, requiresTxidInput: code !== "binance_pay", payableAmount: crypto ? 1.25 : 150,
    payableCurrency: crypto ? "USDT" : "BDT", depositAddressOrNumber: crypto ? "EXAMPLE-ADDRESS-DO-NOT-PAY" : "01XXXXXXXXX", accountType: "personal",
  };
}
export default function CheckoutPreview() {
  const [view, setView] = useState("choose");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const methods = [makeMethod("bkash", "bKash"), makeMethod("nagad", "Nagad"), makeMethod("rocket", "Rocket"), makeMethod("upay", "Upay"), makeMethod("cellfin", "Cellfin"), makeMethod("binance_pay", "Binance Pay", true), makeMethod("bybit_pay", "Bybit Pay", true), makeMethod("usdt_trc20", "USDT TRC-20", true)];
  if (view === "waiting_sms") methods[0] = { ...methods[0], requiresTxidInput: false };
  const submitted = ["submitted", "waiting_sms"].includes(view);
  const session: CheckoutSession | null = now === null ? null : {
    sessionId: "example-checkout-preview", linkId: "example", merchantName: "Illustrative merchant", merchantVerified: false,
    orderTitle: "Example order · GP-0150", amount: 150, currency: "BDT", availableMethods: view === "empty" ? [] : methods,
    ledgerMode: "test", verificationMode: view === "waiting_sms" ? "sms_auto" : "trx_id", requirePayerMatch: true,
    paymentStatus: view === "success" ? "COMPLETED" : view === "expired" ? "EXPIRED" : view === "failed" ? "FAILED" : view === "refunded" ? "REFUNDED" : "PENDING",
    submittedMethod: submitted || view === "success" ? "bkash" : null,
    submittedTxid: view === "submitted" || view === "success" ? "EXAMPLE1234" : null,
    awaitingEvidence: submitted,
    expiresAt: new Date(now + (["expired", "confirming"].includes(view) ? -1000 : 15 * 60 * 1000)).toISOString(), createdAt: new Date(now).toISOString(),
    returnUrl: "/checkout-preview",
  };
  const seed: CheckoutPreviewSeed = {
    step: view === "payer" ? "payer" : view === "verify" ? "verify" : ["payment", "submitted", "waiting_sms"].includes(view) ? "payment" : undefined,
    payerNumber: ["payment", "verify", "submitted", "waiting_sms"].includes(view) ? "01700000000" : undefined,
    cancelMessage: view === "cancelled" ? "Illustrative cancelled checkout. No money moved." : undefined,
  };
  return <main className="gp-checkout-shell min-h-screen px-3 py-6 sm:px-6 sm:py-10">
    <header className="mx-auto mb-6 flex max-w-[1064px] flex-wrap items-end justify-between gap-5 rounded-lg border border-border bg-card p-4 sm:p-5"><div className="min-w-0 max-w-xl"><h1 className="text-lg font-semibold">Checkout flow preview</h1><p className="mt-2 text-xs leading-6 text-muted">Every value is a labeled fixture. No payment APIs are called and no money moves. Do not transfer funds to these example destinations.</p></div><div className="flex items-end gap-3"><Select label="Review a checkout state" value={view} onChange={event => setView(event.target.value)} options={VIEWS}/><ThemeToggle/></div></header>
    {session ? <HostedCheckoutModal key={view} session={session} demoMode previewSeed={seed}/> : <p role="status" className="p-10 text-center text-sm text-muted">Preparing the checkout preview…</p>}
  </main>;
}
