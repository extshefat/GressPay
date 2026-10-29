"use client";

import React, { useMemo } from "react";
import { X } from "lucide-react";
import { HostedCheckoutModal } from "@/features/checkout/components/HostedCheckoutModal";
import { CheckoutSession, PaymentMethod } from "@/lib/types/api";
import { METHOD_THEMES } from "@/lib/method-theme";

function demoMethod(
  code: string,
  name: string,
  category: "mfs" | "crypto",
  currency: "BDT" | "USDT",
  deposit: string,
  accountLabel: string,
  payableAmount: number
): PaymentMethod {
  return {
    code,
    name,
    country: category === "mfs" ? "BD" : "GLOBAL",
    category,
    logo: `/methods/${code}.svg`,
    currency,
    feePercentage: 0,
    fixedFee: 0,
    minAmount: 1,
    maxAmount: 100000,
    isEnabled: true,
    isAutomated: true,
    requiresTxidInput: code !== "binance_pay",
    depositAddressOrNumber: deposit,
    accountLabel,
    theme: METHOD_THEMES[code],
    payableAmount,
    payableCurrency: currency,
    liveReady: true,
  };
}

export function buildDemoCheckoutSession(): CheckoutSession {
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const methods: PaymentMethod[] = [
    demoMethod("bkash", "bKash", "mfs", "BDT", "01712345678", "Merchant Wallet Number", 500),
    demoMethod("nagad", "Nagad", "mfs", "BDT", "01812345678", "Merchant Wallet Number", 500),
    demoMethod(
      "usdt_trc20",
      "USDT TRC-20",
      "crypto",
      "USDT",
      "TXYZdemoWalletAddressGressPayTRC20xx",
      "TRON Receiving Address",
      4.1
    ),
    demoMethod(
      "binance_pay",
      "Binance Pay",
      "crypto",
      "USDT",
      "192837465",
      "Binance Pay UID",
      4.1
    ),
  ];

  return {
    sessionId: `chs_demo_${Date.now().toString(36)}`,
    linkId: "demo_homepage",
    merchantName: "GressPay Demo Store",
    merchantLogo: undefined,
    merchantVerified: true,
    orderTitle: "Live Sandbox Demo Checkout",
    orderDescription: "Interactive demo — no real funds move. Use the sample TrxID to complete.",
    amount: 500,
    currency: "BDT",
    exchangeRateToUsd: 0.0082,
    availableMethods: methods,
    ledgerMode: "test",
    expiresAt: expires,
    createdAt: new Date().toISOString(),
  };
}

export interface LiveDemoCheckoutProps {
  open: boolean;
  onClose: () => void;
}

export const LiveDemoCheckout: React.FC<LiveDemoCheckoutProps> = ({ open, onClose }) => {
  const session = useMemo(() => (open ? buildDemoCheckoutSession() : null), [open]);

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-zinc-950/75 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative w-full max-w-2xl my-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg text-zinc-700 dark:text-zinc-200"
          aria-label="Close live demo checkout"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mb-3 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white text-zinc-950 border border-zinc-200">
            Interactive Live Demo · No Real Payment
          </span>
        </div>
        <HostedCheckoutModal session={session} demoMode />
      </div>
    </div>
  );
};
