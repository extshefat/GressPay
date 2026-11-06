"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { foldTxid } from "@/lib/method-theme";
import type { CheckoutController } from "../hooks/useCheckout";
import { trxHint, validateReference } from "../checkoutMachine";

export function CheckoutVerificationForm({ checkout, demoMode }: { checkout: CheckoutController; demoMode: boolean }) {
  const method = checkout.method!;
  const [pasteNotice, setPasteNotice] = useState("");
  const label = method.code === "usdt_trc20" ? "TRON transaction hash" : method.code === "bybit_pay" ? "Bybit transfer / order ID" : "Transaction ID (TrxID)";
  return <form className="space-y-5 rounded-lg border border-border-strong bg-card p-4 sm:p-5" data-checkout-step="verify" onSubmit={event => { event.preventDefault(); void checkout.verify(); }}>
    <div><h3 className="text-base font-semibold">Verify the payment you made</h3><p className="mt-2 text-sm leading-6 text-muted">The receiving details stay above for your reference. Submit the reference from the completed transfer’s receipt.</p></div>
    <Input label={label} value={checkout.txid} autoComplete="off" autoCapitalize={method.category === "crypto" ? "none" : "characters"} spellCheck={false} disabled={checkout.busy} required={method.requiresTxidInput} maxLength={160} hint={trxHint(method)} error={checkout.referenceError} placeholder={method.code === "usdt_trc20" ? "64-character transaction hash" : "Paste the reference from your receipt"} onChange={event => { checkout.setTxid(foldTxid(method, event.target.value)); checkout.setReferenceError(undefined); setPasteNotice(""); }} onBlur={() => { if (checkout.txid) checkout.setReferenceError(validateReference(method, checkout.txid, !method.requiresTxidInput)); }} onPaste={event => {
      event.preventDefault();
      const value = foldTxid(method, event.clipboardData.getData("text"));
      checkout.setTxid(value); checkout.setReferenceError(validateReference(method, value, !method.requiresTxidInput));
      setPasteNotice("Reference pasted. Check it against your payment receipt.");
    }}/>
    {pasteNotice && <p role="status" className="text-xs leading-6 text-muted">{pasteNotice}</p>}
    {checkout.sender && <p className="text-xs text-muted">Paying number: <span className="font-mono text-ink">{checkout.sender}</span></p>}
    {demoMode && <Button type="button" variant="secondary" size="sm" disabled={checkout.busy} onClick={() => checkout.setTxid(method.code === "usdt_trc20" ? "a".repeat(64) : "EXAMPLE1234")}>Use an example reference</Button>}
    <Button type="submit" size="lg" className="w-full" isLoading={checkout.busy} disabled={!checkout.online || checkout.secondsLeft <= 0} rightIcon={<ArrowRight size={16}/>}>Verify payment</Button>
    <p className="text-xs leading-6 text-muted">Only matching SMS, provider or on-chain evidence can confirm a live payment. This button cannot mark an unpaid order as paid.</p>
  </form>;
}
