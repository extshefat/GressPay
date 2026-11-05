import React from "react";
import Link from "next/link";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="dark bg-ink-solid border-t border-border py-16 text-muted text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-border">
          <div className="col-span-2 space-y-4">
            <GressPayLogo variant="white" size="sm" />
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Bangladesh payment verification for wallets you configure. Optional Binance Pay and USDT TRC-20 are separate. GressPay does not hold the funds.
            </p>
            <div className="flex items-center gap-1.5 text-muted font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Funds stay in the wallets you publish</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
              Bangladesh Rails
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services" className="hover:text-accent transition-colors">
                  bKash number (SMS match)
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-accent transition-colors">
                  Nagad number (SMS match)
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-accent transition-colors">
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
                <Link href="/services" className="hover:text-accent transition-colors">
                  USDT TRC-20 (TRON)
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-accent transition-colors">
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
                <Link href="/developers" className="hover:text-accent transition-colors">
                  REST API Documentation
                </Link>
              </li>
              <li>
                <Link href="/fees" className="hover:text-accent transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-accent transition-colors">
                  Network Status
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/security" className="hover:text-accent transition-colors">
                  Security Disclosures
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-muted font-mono">© 2026 GressPay. All rights reserved. English-only console.</div>
          <div className="flex items-center gap-6 text-[11px] text-muted">
            <Link href="/legal/privacy" className="hover:text-on-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="hover:text-on-ink transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/legal/security" className="hover:text-on-ink transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
