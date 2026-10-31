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
      <div className="h-[380px] w-full max-w-[480px] animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" aria-hidden />
    ),
  }
);
import { Button } from "@/components/ui/button";
import { GressPayLogo } from "@/components/brand/GressPayLogo";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, KeyRound, Smartphone, Sliders, UserPlus } from "lucide-react";

const STEPS = [
  { n: 1, title: "Create account", href: "/register", icon: UserPlus },
  { n: 2, title: "Add gateways", href: "/login", icon: Sliders },
  { n: 3, title: "Install companion", href: "/download", icon: Smartphone },
  { n: 4, title: "Integrate checkout", href: "/developers", icon: KeyRound },
];

export const GlobeHero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-14 md:pt-32 md:pb-20 overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(9,9,11,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(255,255,255,0.05),transparent_55%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="slate" className="gap-1 font-mono text-[10px] uppercase">
                  <ShieldCheck className="w-3 h-3" /> Non-custodial · Direct to your wallet
                </Badge>
              </div>
              <div className="text-[11px] font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                bKash · Nagad · Rocket · Upay · USDT · Binance Pay
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.1]"
            >
              Auto-verify bKash &amp; Nagad — money lands in your wallet
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed"
            >
              Payment automation for Bangladesh MFS and optional crypto. Customers pay numbers you configure; the
              Companion or on-chain checks confirm payment, then your site gets a signed webhook.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs text-zinc-500 dark:text-zinc-500 max-w-xl"
            >
              Building a custom checkout?{" "}
              <Link href="/developers" className="font-medium text-teal-700 dark:text-teal-400 hover:underline">
                REST API docs
              </Link>{" "}
              cover hosted pay links, create/verify endpoints, and HMAC webhooks.
            </motion.p>

            <motion.ol
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 gap-2 pt-1 max-w-lg"
            >
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.n}>
                    <Link
                      href={step.href}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-zinc-50/60 px-2.5 py-2 text-xs font-medium text-zinc-800 transition hover:border-teal-600/40 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-950">
                        {step.n}
                      </span>
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{step.title}</span>
                    </Link>
                  </li>
                );
              })}
            </motion.ol>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-3 pt-1"
            >
              <Link href="/register">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create your account
                </Button>
              </Link>
              <Link href="/developers">
                <Button size="lg" variant="ghost" className="text-zinc-600 dark:text-zinc-400">
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
