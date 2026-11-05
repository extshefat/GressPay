"use client";

import { InteractiveGlobe } from "../3d/InteractiveGlobe";
import Link from "next/link";
import { ArrowRight, Check, Radio, ShieldCheck } from "lucide-react";
import { gatewayLogoPath } from "@/lib/gateway-library";

const wallets = ["bkash", "nagad", "rocket", "upay"];

export function GlobeHero() {
  return (
    <section className="gp-marketing-grid relative overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-page)]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
        <div className="relative z-10">
          <p className="gp-eyebrow">Automated payment verification</p>
          <h1 className="gp-rule-title mt-6 max-w-[11ch] text-[clamp(3rem,6.2vw,5.6rem)] font-semibold text-[var(--text-primary)]">
            Payments matched. Orders moving.
          </h1>
          <p className="mt-6 max-w-[35rem] text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            One branded checkout for local wallets, crypto and regional rails. GressPay verifies the payment evidence before your store fulfils the order.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-ink-solid px-6 text-sm font-semibold text-white shadow-raised dark:bg-brand dark:text-on-brand">
              Start with GressPay <ArrowRight size={16} />
            </Link>
            <Link href="/checkout-preview" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-6 text-sm font-semibold text-[var(--text-primary)]">
              Explore live checkout
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2"><Check size={14} className="text-accent" /> Non-custodial</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-accent" /> Server verified</span>
            <span className="inline-flex items-center gap-2"><Radio size={14} className="text-accent" /> Signed webhooks</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[36rem] lg:mx-0">

          <div className="gp-hero-panel relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-muted)] sm:px-5">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-brand shadow-raised" /> Checkout illustration</span>
              <span>GP-2026-150</span>
            </div>
            <div className="grid sm:grid-cols-[1.08fr_.92fr]">
              <div className="border-b border-[var(--border-color)] p-5 sm:border-b-0 sm:border-r sm:p-6">
                <p className="gp-section-label">Checkout total</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-.04em]">৳1,250.00</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Your Store · Order #150</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {wallets.map((code, index) => (
                    <div key={code} className={`relative flex min-h-16 items-center justify-center rounded-md border bg-white p-2 ${index === 0 ? "border-accent ring-2 ring-accent/10" : "border-border"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gatewayLogoPath(code)} alt={code} className="h-8 w-20 object-contain" />
                      {index === 0 && <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-ink-solid px-4 py-3 text-center text-xs font-bold text-white">Continue with bKash</div>
              </div>
              <div className="relative min-h-[20rem] overflow-hidden bg-ink-solid text-white">
                <div className="absolute inset-x-0 top-0 z-10 flex justify-between p-5 text-[10px] uppercase tracking-widest text-on-ink"><span>South Asia</span><span>Illustrative</span></div>
                <div className="flex h-full min-h-[20rem] items-center justify-center translate-y-5 scale-[.78] sm:translate-y-4 sm:scale-[.88]"><InteractiveGlobe /></div>
                <div className="absolute inset-x-4 bottom-4 rounded-md border border-white/10 bg-black/35 p-3 ">
                  <p className="text-[10px] uppercase tracking-widest text-on-ink">Verification signal</p>
                  <div className="mt-1 flex items-center justify-between"><strong className="text-sm">Receipt matching</strong><span className="text-xs text-on-ink">+ webhook</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 mx-4 -mt-px flex flex-wrap items-center justify-between gap-3 border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 text-[11px] text-[var(--text-muted)] sm:mx-8">
            <span>Live now · Bangladesh wallets + crypto</span><span>Regional rails · staged rollout</span>
          </div>
        </div>
      </div>
    </section>
  );
}
