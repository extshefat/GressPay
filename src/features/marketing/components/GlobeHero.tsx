"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck } from "lucide-react";

const InteractiveGlobe = dynamic(
  () => import("../3d/InteractiveGlobe").then((m) => m.InteractiveGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full max-w-[480px] animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" aria-hidden />
    ),
  }
);

export const GlobeHero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] pb-16 pt-28 transition-colors md:pb-24 md:pt-32">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_10%,rgba(255,255,255,0.04),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-6 text-left lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <GressPayLogo variant="auto" size="lg" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="emerald" className="gap-1 font-mono text-[10px] uppercase">
                  <ShieldCheck className="h-3 w-3" /> Non-custodial
                </Badge>
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-muted)]">
                  Automated message verify for Asia
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-[2.85rem]"
            >
              Automated message verify for Asia
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)]"
            >
              Customers pay into your own wallets. Bangladesh MFS receipts match via companion SMS;
              USDT and Binance Pay verify on-chain or via provider API. India, Pakistan, and Nepal rails
              are listed for expansion.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Create your account
                </Button>
              </Link>
              <Link href="/developers">
                <Button size="lg" variant="outline">
                  Developer docs
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center lg:col-span-5"
          >
            <InteractiveGlobe />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
