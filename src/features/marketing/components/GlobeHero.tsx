"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const InteractiveGlobe = dynamic(
  () => import("../3d/InteractiveGlobe").then((m) => m.InteractiveGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full max-w-[520px] animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" aria-hidden />
    ),
  }
);
import { Button } from "@/components/ui/button";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Layers, ShieldCheck, Zap, Smartphone, CheckCircle2 } from "lucide-react";

export const GlobeHero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      {/* Background Subtle Monochrome Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(0,0,0,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(255,255,255,0.03),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <GressPayLogo size="lg" />
                <Badge variant="emerald" className="gap-1 font-mono text-[10px] uppercase">
                  <ShieldCheck className="w-3 h-3" /> Direct-to-Wallet · 0% Commission
                </Badge>
              </div>
              <div className="text-xs font-mono tracking-wider text-zinc-500 uppercase font-semibold">
                bKash · Nagad · Rocket · Upay · Cellfin · Binance Pay · USDT TRC-20
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15]"
            >
              Automated MFS & Crypto Payment Gateway for Bangladesh.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              Accept customer payments directly into your personal or agent SIM wallet. GressPay Companion auto-matches the provider SMS in under 2 seconds and fires instant webhooks to fulfill your store orders. Zero aggregator commission.
            </motion.p>

            {/* Trust Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>100% Direct to Your Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <span>1-Second SMS Match</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Signed Webhook Dispatch</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/fees">
                <Button size="lg" variant="outline">
                  View Pricing Plans
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="text-[11px] text-zinc-500 pt-1 font-mono"
            >
              Sign up in 30 seconds with Google OAuth or email • No merchant trade license required
            </motion.div>
          </div>

          {/* Right Column: 3D Earth Hero Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 flex justify-center items-center"
          >
            <InteractiveGlobe />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
