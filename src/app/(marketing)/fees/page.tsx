import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function FeesPage() {
  return (
    <div className="pt-32 pb-24 space-y-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="emerald" dot>
          Direct-to-Wallet Philosophy
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Transparent, Non-Custodial Automation
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          GressPay does not take a percentage of your revenue or hold customer money in escrow. All customer transfers go straight from the buyer to your own wallet.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Direct Wallet Transfer
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Customers pay your published bKash number, Nagad number, or TRON USDT address directly. Your capital is never locked in a third-party gateway balance.
          </p>
        </Card>

        <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Plans are not public prices
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Subscription prices are not listed here. An administrator can record plans and credit balances. Those balances are not deducted when a checkout or API call runs.
          </p>
        </Card>

        <Card className="p-6 space-y-3 border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Zero Hidden Deductions
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Standard provider MFS cash-out or network gas fees apply only when you move funds on your own devices. GressPay never levies secret settlement deductions.
          </p>
        </Card>
      </div>

      {/* Product Explanation Card */}
      <Card className="p-8 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            How Plans and Allowances Are Managed
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Plan rows and credit adjustments are admin records. They are not a card checkout, and signing in does not start a paid subscription. Test and live payment ledgers stay separate regardless of any plan row.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/login">
            <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Sign In to View Console
            </Button>
          </Link>
          <Link href="/help">
            <Button variant="outline" leftIcon={<HelpCircle className="w-4 h-4" />}>
              Contact Merchant Support
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
