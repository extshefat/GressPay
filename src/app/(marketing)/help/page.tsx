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
      "To the wallet or address you configure: your bKash/Nagad number, Binance Pay settlement to your account, or your TRC-20 USDT address. GressPay does not hold your balances.",
  },
  {
    question: "Which rails are in this release?",
    answer:
      "Bangladesh: bKash and Nagad (personal + SMS companion). Crypto when operator-enabled: Binance Pay (official Binance Pay API) and USDT TRC-20 (on-chain verify). India, Pakistan, Nepal, Rocket/Upay/Cellfin, and Bybit are not live in this milestone.",
  },
  {
    question: "Is Binance Pay the same as Spot API keys?",
    answer:
      "No. GressPay uses Binance Pay API credentials only (not Spot trading keys). Spot trading, withdrawals, and unrestricted personal API keys are out of scope and must not be pasted into the browser. Buyers never enter an order ID; the server creates the order. Signed-in account holders can reconcile from the dashboard; reconcile is rate-limited.",
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
    <div className="pt-28 pb-20 space-y-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="cyan" dot>
          Help
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Honest answers for the first-release rails — SMS companion, Binance Pay, and USDT TRC-20.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq) => (
          <Card key={faq.question} className="p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{faq.question}</h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">{faq.answer}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-teal-700/10 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300 flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Need the API reference?</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          See the Developers page for endpoints, authentication, webhooks, and state transitions.
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
