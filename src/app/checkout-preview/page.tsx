"use client";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { useState, useEffect } from 'react';
import { HostedCheckoutModal } from '@/features/checkout/components/HostedCheckoutModal';
import { CheckoutSession, PaymentMethod } from '@/lib/types/api';

export default function CheckoutPreview() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  useEffect(() => {
    const method = (code: string, name: string, crypto = false): PaymentMethod => {
      const currency = crypto ? "USDT" : "BDT";
      return {
        code, name, country: crypto ? "GLOBAL" : "BD", category: crypto ? "crypto" : "mfs",
        logo: gatewayLogoPath(code), currency, feePercentage: 0, fixedFee: 0,
        minAmount: 1, maxAmount: 100000, isEnabled: true, isAutomated: true,
        requiresTxidInput: code !== "binance_pay", payableAmount: crypto ? 1.25 : 150,
        payableCurrency: currency,
      };
    };
    setSession({
      sessionId: "demo-checkout-preview", linkId: "demo", merchantName: "Studio Sample",
      merchantVerified: false, orderTitle: "Digital print · Order GP-0150", amount: 150, currency: "BDT",
      availableMethods: [
        method("bkash", "bKash"), method("nagad", "Nagad"),
        method("binance_pay", "Binance Pay", true), method("usdt_trc20", "USDT TRC-20", true),
      ],
      ledgerMode: "test", verificationMode: "trx_id",
      expiresAt: new Date(Date.now() + 1800000).toISOString(), createdAt: new Date().toISOString(),
    });
  }, []);
  return (
    <main className="gp-checkout-shell min-h-screen px-3 py-6 sm:py-12">
      <div className="mx-auto mb-5 max-w-[30rem] rounded-xl border border-zinc-300/80 bg-white/90 p-4 text-center text-sm shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/90">
        <strong>Checkout preview</strong>
        <p className="mt-1 text-xs text-zinc-500">Try a sample order. No money will move.</p>
      </div>
      {session && <HostedCheckoutModal session={session} demoMode />}
    </main>
  );
}
