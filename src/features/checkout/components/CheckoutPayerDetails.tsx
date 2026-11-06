"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CheckoutSession } from "@/lib/types/api";
import type { CheckoutController } from "../hooks/useCheckout";
import { isMobileMethod } from "../checkoutMachine";

export function CheckoutPayerDetails({ session, checkout }: { session: CheckoutSession; checkout: CheckoutController }) {
  const mobile = isMobileMethod(checkout.method);
  const required = checkout.smsAuto || session.requirePayerMatch === true;
  return <form data-checkout-step="payer" className="space-y-5" onSubmit={event => { event.preventDefault(); checkout.continueToPayment(); }}>
    {mobile && <><p className="text-sm leading-7 text-muted">Enter the number you will pay from. The next screen shows the merchant’s receiving number and exact amount.</p><Input label={`Your ${checkout.method?.name || "payment"} number${required ? "" : " (optional)"}`} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={checkout.sender} onChange={event => checkout.setSender(event.target.value)} error={checkout.payerError} hint="Use your own wallet number, not the merchant’s receiving number. Never enter a PIN or OTP." required={required}/></>}
    {(session.customFields || []).map(field => <Input key={field.id} label={field.label} required={field.required} type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"} value={checkout.fields[field.id] || ""} onChange={event => checkout.setFields(current => ({ ...current, [field.id]: event.target.value }))}/>)}
    <Button type="submit" className="w-full" size="lg" rightIcon={<ArrowRight size={16}/>}>Continue to payment details</Button>
    <p className="text-xs leading-6 text-muted">Continuing does not charge your wallet or confirm a payment.</p>
  </form>;
}
