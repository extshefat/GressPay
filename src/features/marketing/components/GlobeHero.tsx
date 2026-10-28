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
      {/* Background Teal Atmosphere Grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(15,118,110,0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(45,212,191,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_40%,rgba(15,118,110,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_50%_40%_at_85%_40%,rgba(45,212,191,0.06),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15,118,110,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,118,110,0.06) 1px, transparent 1px)",
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
                  <ShieldCheck className="w-3 h-3" /> Bangladesh First · Non-Custodial
                </Badge>
              </div>
              <div className="text-xs font-mono tracking-wider text-teal-700 dark:text-teal-400 uppercase font-semibold">
                bKash · Nagad · USDT TRC-20
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15]"
            >
              Automated Payment Verification for Bangladesh.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              Customers pay the bKash or Nagad number you publish. A paired Android companion can match the provider SMS to the checkout. Optional Binance Pay and USDT TRC-20 are separate checks. Funds stay in the wallet you configured.
            </motion.p>

            {/* Trust Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Funds stay in your wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Companion SMS match</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>One signed webhook</span>
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
                  Sign up
                </Button>
              </Link>
              <Link href="/developers">
                <Button size="lg" variant="secondary" leftIcon={<Layers className="w-4 h-4" />}>
                  Explore API Docs
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="text-[11px] text-zinc-500 pt-1"
            >
              Sign in with Google to open a merchant account, then add your own receiving numbers. Password sign-in remains available for existing accounts.
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
