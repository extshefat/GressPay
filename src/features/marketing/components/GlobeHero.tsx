"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { InteractiveGlobe } from "../3d/InteractiveGlobe";
import { Button } from "@/components/ui/button";
import { GpMark } from "@/components/brand/GpMark";
import { ArrowRight, Layers } from "lucide-react";

export const GlobeHero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      {/* Teal atmosphere — radial + soft grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(15,118,110,0.14),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_40%,rgba(15,118,110,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_50%_40%_at_85%_40%,rgba(45,212,191,0.08),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
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
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3"
            >
              <GpMark size="lg" />
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  GressPay
                </div>
                <div className="text-[11px] font-mono tracking-wider text-teal-700 dark:text-teal-400 uppercase">
                  South Asia · USDT
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 leading-[1.15]"
            >
              Accept local wallets and crypto in one checkout.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              Create payment links, accept bKash, Nagad, UPI, Easypaisa, eSewa, Binance Pay, or USDT,
              and verify settlements with TxID or companion SMS match.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create merchant account
                </Button>
              </Link>
              <Link href="/developers">
                <Button size="lg" variant="secondary" leftIcon={<Layers className="w-4 h-4" />}>
                  Developer docs
                </Button>
              </Link>
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
    </section>
  );
};
