"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "How does bKash and Nagad verification work without official aggregator contracts?",
      answer:
        "Customers send payment directly to your designated personal or merchant wallet number. Once the transaction completes, their phone receives an official SMS from bKash or Nagad. Our GressPay Android Companion running on your phone reads incoming provider SMS notifications in real time, parses the exact amount and Transaction ID (TrxID), and cryptographically matches it with the pending checkout session within 2-3 seconds.",
    },
    {
      question: "Does GressPay hold or escrow our merchant money?",
      answer:
        "No. GressPay operates on a strictly non-custodial direct-to-wallet principle. All fiat funds land instantly in your personal or merchant bKash/Nagad wallet, and USDT settles straight to your TRON address. GressPay provides automation and verification signals only.",
    },
    {
      question: "How does USDT TRC-20 verification work on GressPay?",
      answer:
        "USDT TRC-20 uses native TRON blockchain RPC queries via TronGrid. When your customer sends USDT to your TRON wallet address and submits the 64-character transaction hash, GressPay inspects the on-chain transfer events, verifies the recipient Base58 address matches your wallet, checks the exact 6-decimal micro-USDT amount, and verifies the required block depth before marking the checkout paid.",
    },
    {
      question: "Is my Android device secure? What permissions does the companion app require?",
      answer:
        "The companion APK requires only SMS reception/read permissions (`RECEIVE_SMS`, `READ_SMS`) to parse incoming payment receipts from designated sender IDs (bKash, 16216, etc.) and a foreground service permission to remain active. It never accesses your contacts, personal messages, or banking PINs. All communications between the app and the GressPay backend are encrypted using unique bearer tokens that can be revoked with one click.",
    },
    {
      question: "What happens if a customer enters an invalid or mistyped TrxID?",
      answer:
        "GressPay puts the checkout session into a PENDING state while verifying. If the submitted TrxID does not match any confirmed SMS or on-chain transaction hash within the session timeout window (default 15 minutes), the checkout status expires safely without marking the order as paid. The customer can retry or your support agent can inspect unmatched incoming logs.",
    },
    {
      question: "How does GressPay prevent duplicate transaction and replay attacks?",
      answer:
        "Every transaction identifier (bKash/Nagad TrxID or TRON TxID) is strictly unique and indexed in the immutable database. Once a TrxID has been verified and settled against an order, any subsequent attempt to submit that same identifier—whether on the same store or across different merchant accounts—is instantly rejected as duplicate.",
    },
    {
      question: "How does Sandbox mode differ from Live mode?",
      answer:
        "Sandbox mode lets you test the entire end-to-end checkout flow without moving real funds. When making API requests with `gp_test_` keys or using the dashboard with `X-GressPay-Mode: test`, test transactions simulate instant SMS matches and webhook deliveries. Your live ledger balance is completely untouched.",
    },
    {
      question: "What is GressPay's webhook delivery and retry policy?",
      answer:
        "When a transaction settles, GressPay fires an HTTP POST webhook to your configured endpoint with the `X-GressPay-Signature` HMAC header. If your endpoint does not respond with HTTP 200 within 5 seconds, GressPay automatically retries using an exponential backoff schedule (retries after 1m, 5m, 15m, 1h, and 6h) until acknowledged.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="emerald" dot>
            FAQ
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Everything you need to know about Bangladesh MFS companion automation, crypto settlements, and security guarantees.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                >
                  <span className="pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-teal-600 dark:text-teal-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/50 dark:border-zinc-800/60 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
