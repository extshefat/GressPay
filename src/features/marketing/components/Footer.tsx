import React from "react";
import Link from "next/link";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-16 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-zinc-850">
          <div className="col-span-2 space-y-4">
            <GressPayLogo variant="white" size="sm" />
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Bangladesh payment verification for wallets you configure. Optional Binance Pay and USDT TRC-20 are separate. GressPay does not hold the funds.
            </p>
            <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Funds stay in the wallets you publish</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Bangladesh Rails
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services" className="hover:text-teal-400 transition-colors">
                  bKash number (SMS match)
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-teal-400 transition-colors">
                  Nagad number (SMS match)
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-teal-400 transition-colors">
                  Android Companion APK
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
                <Link href="/services" className="hover:text-teal-400 transition-colors">
                  USDT TRC-20 (TRON)
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-teal-400 transition-colors">
                  Binance Pay API
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Developers & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/developers" className="hover:text-teal-400 transition-colors">
                  REST API Documentation
                </Link>
              </li>
              <li>
                <Link href="/fees" className="hover:text-teal-400 transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-teal-400 transition-colors">
                  Network Status
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-teal-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/security" className="hover:text-teal-400 transition-colors">
                  Security Disclosures
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-zinc-400 font-mono">© 2026 GressPay. All rights reserved. English-only console.</div>
          <div className="flex items-center gap-6 text-[11px] text-zinc-400">
            <Link href="/legal/privacy" className="hover:text-zinc-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-zinc-200 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/legal/security" className="hover:text-zinc-200 transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
