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
import { ArrowRight, ShieldCheck, KeyRound, Smartphone, Sliders, UserPlus } from "lucide-react";

const STEPS = [
  { n: 1, title: "Create account", href: "/register", icon: UserPlus },
  { n: 2, title: "Add gateways", href: "/dashboard/methods", icon: Sliders },
  { n: 3, title: "Pair companion", href: "/dashboard/devices", icon: Smartphone },
  { n: 4, title: "API keys & integrate", href: "/developers", icon: KeyRound },
];

export const GlobeHero: React.FC = () => {
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
                  <ShieldCheck className="w-3 h-3" /> Non-Custodial · Direct Settlement
                </Badge>
              </div>
              <div className="text-xs font-mono tracking-wider text-zinc-600 dark:text-zinc-400 uppercase font-semibold">
                bKash · Nagad · Rocket · Upay · USDT · Binance Pay
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.12]"
            >
              Merchant payment automation for Bangladesh MFS &amp; crypto
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              Connect your store to{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">gresspay.extxcheats.com</span> with real
              API keys, then call{" "}
              <code className="font-mono text-xs">POST /payment/create</code> and{" "}
              <code className="font-mono text-xs">POST /payment/verify</code> on your site.
            </motion.p>

            <motion.ol
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
            >
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.n}>
                    <Link
                      href={step.href}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-zinc-100"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-950">
                        {step.n}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span>{step.title}</span>
                    </Link>
                  </li>
                );
              })}
            </motion.ol>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create merchant account
                </Button>
              </Link>
              <Link href="/developers">
                <Button size="lg" variant="secondary">
                  Integration docs
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
