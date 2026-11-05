"use client";

import { useEffect, useMemo, useState } from "react";
import { HostedCheckoutModal } from "@/features/checkout/components/HostedCheckoutModal";
import {
  CheckoutCancelledView,
  CheckoutConfirmingExpiryView,
  CheckoutExpiredView,
  CheckoutFailedView,
  CheckoutSuccessView,
  CheckoutWaitingSmsView,
} from "@/features/checkout/components/CheckoutStatusViews";
import { gatewayLogoPath } from "@/lib/gateway-library";
import type { CheckoutSession, PaymentMethod } from "@/lib/types/api";

const STATES = [
  "live",
  "waiting_sms",
  "success",
  "expired",
  "cancelled",
  "failed",
  "confirming",
] as const;

export default function CheckoutPreview() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [view, setView] = useState<(typeof STATES)[number]>("live");

  useEffect(() => {
    const method = (code: string, name: string, crypto = false): PaymentMethod => {
      const currency = crypto ? "USDT" : "BDT";
      return {
        code,
        name,
        country: crypto ? "GLOBAL" : "BD",
        category: crypto ? "crypto" : "mfs",
        logo: gatewayLogoPath(code),
        currency,
        feePercentage: 0,
        fixedFee: 0,
        minAmount: 1,
        maxAmount: 100000,
        isEnabled: true,
        isAutomated: true,
        requiresTxidInput: code !== "binance_pay",
        payableAmount: crypto ? 1.25 : 150,
        payableCurrency: currency,
        depositAddressOrNumber: crypto ? "TXdemoWalletAddress123" : "01XXXXXXXXX",
        trxHint: "Enter the TrxID from your confirmation SMS",
      };
    };
    setSession({
      sessionId: "demo-checkout-preview",
      linkId: "demo",
      merchantName: "Studio Sample",
      merchantVerified: false,
      orderTitle: "Digital print · Order GP-0150",
      amount: 150,
      currency: "BDT",
      availableMethods: [
        method("bkash", "bKash"),
        method("nagad", "Nagad"),
        method("binance_pay", "Binance Pay", true),
        method("usdt_trc20", "USDT TRC-20", true),
      ],
      ledgerMode: "test",
      verificationMode: "trx_id",
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      createdAt: new Date().toISOString(),
      returnUrl: "/checkout-preview",
    });
  }, []);

  const specimen = useMemo(() => {
    if (!session) return null;
    switch (view) {
      case "waiting_sms":
        return <CheckoutWaitingSmsView message="Illustrative waiting state." pollingSeconds={12} txid="DEMOBKASH01" />;
      case "success":
        return <CheckoutSuccessView session={session} demoMode redirectCountdown={4} />;
      case "expired":
        return <CheckoutExpiredView returnUrl="/checkout-preview" />;
      case "cancelled":
        return <CheckoutCancelledView message="Illustrative cancel." redirectUrl="/checkout-preview" redirectSec={3} />;
      case "failed":
        return <CheckoutFailedView merchantName={session.merchantName} sessionId={session.sessionId} returnUrl="/checkout-preview" />;
      case "confirming":
        return <CheckoutConfirmingExpiryView />;
      default:
        return <HostedCheckoutModal session={session} demoMode />;
    }
  }, [session, view]);

  return (
    <main className="gp-checkout-shell min-h-screen px-3 py-6 sm:py-12">
      <div className="mx-auto mb-5 max-w-[32rem] space-y-3 rounded-xl border border-border bg-card/95 p-4 text-center text-sm shadow-raised">
        <strong>Checkout preview</strong>
        <p className="text-xs text-muted">Fixed fixtures for visual QA. No money moves. Excluded from search indexing.</p>
        <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Checkout states">
          {STATES.map((state) => (
            <button
              key={state}
              type="button"
              role="tab"
              aria-selected={view === state}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${view === state ? "border-accent bg-accent/10" : "border-border"}`}
              onClick={() => setView(state)}
            >
              {state}
            </button>
          ))}
        </div>
      </div>
      {specimen}
    </main>
  );
}
