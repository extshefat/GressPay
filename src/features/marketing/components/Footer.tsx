import React from "react";
import Link from "next/link";
import { GressPayLogo } from "@/components/brand/GressPayLogo";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-void-pure border-t border-void-border/70 py-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-void-border/60">
          <div className="col-span-2 space-y-4">
            <GressPayLogo variant="white" size="sm" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Merchant payment gateway for Bangladesh, India, Pakistan, Nepal, and USDT. Funds go to
              the wallets you publish. GressPay records, confirms, and notifies.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Methods
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  bKash · Nagad · Rocket · Upay · Cellfin
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  UPI QR · PhonePe
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  Easypaisa · JazzCash
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  eSewa · Khalti
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Crypto
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  Binance Pay
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  Bybit Pay
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-brand-cyan transition-colors">
                  USDT TRC-20
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/fees" className="hover:text-brand-cyan transition-colors">
                  Fees
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-brand-cyan transition-colors">
                  Developer API
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-brand-cyan transition-colors">
                  Help
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-brand-cyan transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500 font-mono">© 2026 GressPay. All rights reserved.</div>
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <Link href="/legal/security" className="hover:text-white">
              Security
            </Link>
            <Link href="/status" className="hover:text-white">
              Status
            </Link>
            <Link href="/legal/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
