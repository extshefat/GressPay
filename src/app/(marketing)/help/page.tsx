import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    question: "How does bKash / Nagad confirmation work?",
    answer:
      "Configure one or more gateways (receiving number + optional QR image) in the dashboard. The buyer Send-Money to the selected account / QR, then pastes the TxID. Scanning a QR or pasting a TxID alone never completes a live payment — the Android companion must upload matching SMS evidence (or you manually Confirm with an auditable reason).",
  },
  {
    question: "Where does the money go?",
    answer:
      "To the wallet or address you configure: your bKash/Nagad number, Binance Pay merchant settlement, or your TRC-20 USDT address. GressPay does not hold merchant balances.",
  },
  {
    question: "Which rails are in this release?",
    answer:
      "Bangladesh: bKash and Nagad (personal + SMS companion). Crypto when operator-enabled: Binance Pay (official merchant API) and USDT TRC-20 (on-chain verify). India, Pakistan, Nepal, Rocket/Upay/Cellfin, and Bybit are not live in this milestone.",
  },
  {
    question: "Is Binance Pay the same as Spot API keys?",
    answer:
      "No. GressPay uses Binance Pay Merchant credentials only. Spot trading, withdrawals, and unrestricted personal API keys are out of scope and must not be pasted into the browser. Buyers never enter an order ID; the server creates the order. Merchant reconcile requires login and is rate-limited.",
  },
  {
    question: "How is USDT TRC-20 verified?",
    answer:
      "The buyer sends USDT on TRON only, then pastes the 64-character hash. The server checks the official USDT contract, your Base58 receive address, exact micro-amount, and confirmations. A pasted hash alone never completes a live payment.",
  },
  {
    question: "Where do I get my API key?",
    answer:
      "Each brand has its own live gp_live_ website key under Dashboard → Brands (Copy puts the full secret on your clipboard). Register Companion phones under Devices for gpdev_ device keys. Webhook signing secrets are under Webhooks & Integration.",
  },
];

export default function HelpPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="cyan" dot>
          Help
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-base text-slate-300 leading-relaxed">
          Honest answers for the first-release rails — SMS companion, Binance Pay, and USDT TRC-20.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq) => (
          <Card key={faq.question} className="p-6 bg-void-card border-void-border/80 space-y-2">
            <h3 className="text-base font-semibold text-white">{faq.question}</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1">{faq.answer}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-void-surface border-brand-cyan/30 text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Need the API reference?</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          See backend/GressPay-API.md and the Developers page for scopes, webhooks, and state transitions.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/developers">
            <Button variant="outline" size="md">
              Read the API
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="md">
              Create account
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
