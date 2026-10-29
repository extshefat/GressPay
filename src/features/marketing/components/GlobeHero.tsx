"use client";

import React, { useState } from "react";
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
import { ArrowRight, FlaskConical, ShieldCheck, Zap, Smartphone, CheckCircle2 } from "lucide-react";
import { LiveDemoCheckout } from "./LiveDemoCheckout";

export const GlobeHero: React.FC = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(9,9,11,0.06),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(255,255,255,0.06),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.25] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(9,9,11,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(9,9,11,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <GressPayLogo size="lg" />
                <Badge variant="slate" className="gap-1 font-mono text-[10px] uppercase">
                  <ShieldCheck className="w-3 h-3" /> Non-Custodial · 0% Commission
                </Badge>
              </div>
              <div className="text-xs font-mono tracking-wider text-zinc-600 dark:text-zinc-400 uppercase font-semibold">
                bKash · Nagad · Rocket · Crypto
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.12]"
            >
              GressPay
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg sm:text-xl font-semibold text-zinc-800 dark:text-zinc-200 max-w-2xl leading-snug"
            >
              Accept bKash, Nagad, Rocket &amp; Crypto Directly to Your Personal Wallet — 0% Commission, 1-Second Auto Verification
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              The non-custodial MFS &amp; crypto payment automation platform. Funds hit your wallet instantly. Our Android companion matches SMS in about one second. Plug into WordPress, Laravel, PHP, or Next.js with signed webhooks.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs text-zinc-700 dark:text-zinc-300"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <span>100% Direct-to-Wallet</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <span>1-Second Companion Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <span>Plug &amp; Play Webhooks</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Accepting Payments
                </Button>
              </Link>
              <Button
                size="lg"
                variant="secondary"
                leftIcon={<FlaskConical className="w-4 h-4" />}
                onClick={() => setDemoOpen(true)}
              >
                Try Live Demo Checkout
              </Button>
            </motion.div>
          </div>

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

      <LiveDemoCheckout open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
};
