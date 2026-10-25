import React from "react";
import { Badge } from "@/components/ui/badge";

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="border-t border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Badge variant="emerald" className="font-mono text-[10px] uppercase">
          About
        </Badge>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Why GressPay
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <p>
            GressPay is a Bangladesh-first checkout and verification console. A customer pays a wallet the merchant configured. The server marks that checkout complete only after evidence it can check: a paired Android companion SMS for bKash or Nagad, a Binance Pay order query for Merchant API payments, or a TRON transfer for USDT TRC-20.
          </p>
          <p>
            Each merchant is a separate brand. Binance Pay credentials are sealed per brand and are not returned to the browser. A return URL does not mark a payment paid. The product does not hold, settle, or move the customer&apos;s money.
          </p>
          <p>
            Account type on a bKash or Nagad number is a label for the merchant&apos;s own instructions. It is not an official bKash or Nagad API connection. Binance Pay is optional and uses Binance Pay Merchant API credentials, which are not Spot trading keys. USDT TRC-20 is a separate on-chain check and is not a Binance Pay receipt.
          </p>
        </div>
      </div>
    </section>
  );
};
