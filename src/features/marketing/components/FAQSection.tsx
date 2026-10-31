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
        "The customer sends money to the bKash or Nagad number you saved. The Android companion on a phone you paired reads the provider SMS and posts the amount and TrxID. The server completes the live checkout only when that SMS matches the same brand, rail, TrxID, and amount. A typed TrxID without a matching SMS stays pending. The account type you pick is a label for your instructions, not an official provider API.",
    },
    {
      question: "Does GressPay hold or escrow our money?",
      answer:
        "No. The customer pays the bKash number, Nagad number, Binance Pay checkout, or TRON address you configured. GressPay records whether the evidence matched. It does not hold, settle, or move those funds.",
    },
    {
      question: "How does USDT TRC-20 verification work on GressPay?",
      answer:
        "This is separate from Binance Pay. The customer sends USDT on TRON to the address you saved and submits the transaction hash. The server asks TronGrid for the transfer, then checks the token contract, recipient, exact amount, and the configured confirmation count. A hash that fails those checks does not mark the checkout paid.",
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
        "A completed bKash, Nagad, or TRON identifier cannot be used again for another checkout in the same brand. The check is per brand, not a global block across every account on the platform.",
    },
    {
      question: "How do I integrate GressPay on my website?",
      answer:
        "Create your account, add your receiving gateways, copy your website API key from Dashboard → Brands, then call POST /api/v1/payment/create from your server and redirect buyers to the returned payment_url. Confirm settlement with POST /api/v1/payment/verify or signed webhooks before fulfilling orders.",
    },
    {
      question: "What is GressPay's webhook delivery and retry policy?",
      answer:
        "After a checkout is marked paid, GressPay sends one HTTPS POST with an HMAC-SHA256 X-GressPay-Signature over the raw body. The attempt is logged. There is no automatic retry schedule in this build. If your endpoint is down, the delivery stays logged and is not replayed on its own.",
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
            How verification, wallets, and webhooks behave in this build.
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
