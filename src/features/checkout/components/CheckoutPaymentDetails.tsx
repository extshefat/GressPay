"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { CopyValue } from "@/components/ui/copy-value";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { QR_COLORS } from "@/lib/design/tokens";
import { formatCurrency } from "@/lib/formatters";
import type { CheckoutSession, PaymentMethod } from "@/lib/types/api";
import type { CheckoutController } from "../hooks/useCheckout";
import { formatSessionClock, isMobileMethod, paymentCategory } from "../checkoutMachine";

function action(method: PaymentMethod): string {
  return ({ agent: "Cash Out", merchant: "Business payment", payment: "Payment" } as Record<string, string>)[(method.accountType || "personal").toLowerCase()] || "Send Money";
}
function instructions(method: PaymentMethod, amount: string): string[] {
  if (isMobileMethod(method)) return [`Open your ${method.name} app and choose ${action(method)}.`, `Use the merchant’s receiving number above and send exactly ${amount}.`, method.requiresTxidInput ? "Keep your receipt. You will enter its transaction ID after paying." : "Return here after paying. The server checks the merchant’s payment SMS."];
  if (method.code === "usdt_trc20") return ["Choose USDT on the TRON (TRC-20) network in your wallet.", `Send exactly ${amount} to the receiving address above. Other networks are not supported.`, "Save the transaction hash from your wallet receipt. GressPay checks the transfer on-chain."];
  if (method.code === "bybit_pay") return ["Open Bybit Pay / Internal Transfer in the Bybit app.", `Transfer ${amount} to the merchant’s UID above.`, "Save the transfer / order ID. Confirmation requires provider evidence."];
  if (method.instructions) return [method.instructions, "Keep the payment receipt and use the transaction reference for verification."];
  return [`Send exactly ${amount} to the receiving account above.`, "Save the payment receipt and continue to verification after paying."];
}
export function CheckoutPaymentDetails({ session, checkout, demoMode, children }: { session: CheckoutSession; checkout: CheckoutController; demoMode: boolean; children?: React.ReactNode }) {
  const method = checkout.method!;
  const crypto = paymentCategory(method) === "crypto";
  const amount = method.payableAmount ?? session.amount;
  const currency = method.payableCurrency ?? method.currency;
  const amountLabel = formatCurrency(amount, currency, { maximumFractionDigits: 8 });
  const destination = method.depositAddressOrNumber || "";
  const [qr, setQr] = useState<{ value: string; url: string } | null>(null);
  const provider = method.code === "binance_pay";
  useEffect(() => {
    if (!crypto || provider || !destination || demoMode) return;
    let active = true;
    void import("qrcode").then(module => module.toDataURL(destination, { width: 200, margin: 2, color: QR_COLORS, errorCorrectionLevel: "M" })).then(url => { if (active) setQr({ value: destination, url }); }).catch(() => { /* Address remains fully visible/copyable when QR generation fails. */ });
    return () => { active = false; };
  }, [crypto, provider, destination, demoMode]);
  const qrUrl = qr?.value === destination ? qr.url : method.qrImageUrl;
  return <div className="space-y-5" data-checkout-step="payment">
    {provider ? <div className="space-y-5 rounded-lg border border-border bg-surface p-5"><p className="text-sm leading-7 text-muted">Continue to Binance Pay to pay this merchant. This page waits for server-side provider confirmation; opening Binance does not mark the order paid.</p><CopyValue label="Exact amount" value={String(amount)} displayValue={amountLabel}/>{!checkout.submitted && <Button type="button" className="w-full" size="lg" isLoading={checkout.busy} disabled={!checkout.online} onClick={() => void checkout.verify()} rightIcon={<ExternalLink size={16}/>}>Open Binance Pay</Button>}</div> : <>
      <div className="grid gap-3"><CopyValue label="Exact amount to send" value={String(amount)} displayValue={amountLabel}/>{destination ? <CopyValue label={method.accountLabel || (crypto ? method.code === "bybit_pay" ? "Merchant’s receiving UID" : "Merchant’s receiving address" : "Merchant’s receiving number")} value={destination} hint={method.code === "usdt_trc20" ? "USDT · TRON (TRC-20) only" : isMobileMethod(method) ? `${method.accountType || "personal"} account · ${action(method)}` : undefined}/> : <Alert variant="warning" title="Receiving account unavailable">Contact the merchant or choose another configured payment method before sending money.</Alert>}</div>
      {qrUrl && !demoMode && <div className="space-y-2 rounded-lg border border-border bg-surface p-4 text-center"><Image src={qrUrl} alt={`Receiving ${method.name} payment QR`} width={200} height={200} unoptimized className="mx-auto h-48 w-48 max-w-full rounded-md bg-on-ink p-2"/><p className="text-xs text-muted">Scan the receiving {crypto ? "address" : "account"}; check the exact amount before sending.</p></div>}
      <section className="rounded-lg border border-border bg-surface p-4"><h3 className="text-sm font-semibold">How to pay</h3><ol className="mt-4 space-y-4">{instructions(method, amountLabel).map((instruction, index) => <li key={index} className="flex items-start gap-3 text-sm leading-6 text-muted"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-card font-mono text-xs font-semibold text-ink">{index + 1}</span><span>{instruction}</span></li>)}</ol></section>
      {!checkout.submitted && checkout.step === "payment" && <section className="space-y-4 rounded-lg border border-border-strong bg-card p-4" aria-label="Waiting for your payment"><div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold"><Clock size={16} className="text-accent" aria-hidden/>Waiting for your payment</span><span className="font-mono text-sm font-semibold tabular-nums">{formatSessionClock(checkout.secondsLeft)}</span></div><p className="text-xs leading-6 text-muted">Pay using the details above before the payment window ends. Continue only after the transfer is complete.</p><Button type="button" size="lg" className="w-full" disabled={!destination || checkout.secondsLeft <= 0 || !checkout.online} onClick={() => { if (checkout.smsAuto) void checkout.verify(); else checkout.setStep("verify"); }} isLoading={checkout.busy} rightIcon={<ArrowRight size={16}/>}>
        I have paid
      </Button><p className="text-xs leading-5 text-muted">{checkout.smsAuto ? "Next: match the merchant’s payment SMS." : "Next: enter the transaction ID from your receipt."}</p></section>}
    </>}
    {checkout.submitted && <section className="space-y-4 rounded-lg border border-brand/50 bg-brand-soft p-4" aria-label="Server verification"><div className="flex items-center gap-2 text-sm font-semibold"><RefreshCw size={16} aria-hidden className="text-accent"/><span>{checkout.smsAuto ? "Waiting for payment SMS" : "Verifying your payment"}</span></div><p role="status" className="text-sm leading-6 text-muted">{checkout.message || "Your payment has been submitted. The server is checking the evidence."}</p><StatusTimeline events={[
      { id: "reference", title: checkout.smsAuto ? "Paying number submitted" : provider ? checkout.providerUrl ? "Provider checkout opened" : "Provider order registered" : "Transaction reference submitted", status: "completed" },
      { id: "evidence", title: isMobileMethod(method) ? "Match the merchant’s payment SMS" : "Confirm the payment with the provider", status: "current" },
      { id: "complete", title: "Confirm the order", status: "pending" },
    ]}/>{checkout.txid && <p className="break-all font-mono text-xs text-muted">Submitted reference: {checkout.txid}</p>}<p className="text-xs text-muted">{checkout.elapsed}s elapsed. Confirmation can take time; do not pay twice.</p>{checkout.providerUrl && <a href={checkout.providerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent underline">Continue to Binance Pay <ExternalLink size={14}/></a>}<div className="flex flex-wrap gap-3">{provider && !checkout.providerUrl && <Button type="button" variant="secondary" size="sm" isLoading={checkout.busy} disabled={!checkout.online} onClick={() => void checkout.verify()}>Reopen Binance Pay</Button>}<Button type="button" variant="secondary" size="sm" onClick={checkout.retryStatus} disabled={!checkout.online}>Check status again</Button>{!provider && <Button type="button" variant="ghost" size="sm" onClick={checkout.editReference}>Correct the reference</Button>}</div></section>}
    {children}
  </div>;
}
