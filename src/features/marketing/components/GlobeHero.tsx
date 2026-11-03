"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const InteractiveGlobe = dynamic(
  () => import("../3d/InteractiveGlobe").then((module) => module.InteractiveGlobe),
  { ssr: false, loading: () => <div aria-hidden className="h-64 sm:h-80" /> }
);

export function GlobeHero() {
  return (
    <section className="border-b border-[var(--border-color)] bg-[var(--bg-page)] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.03fr_1fr] lg:gap-16">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.13em] text-[var(--text-secondary)]">
            <span aria-hidden className="h-px w-8 bg-teal-600" /> Payment verification for Asia
          </p>
          <h1 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,5.2vw,4.8rem)] font-semibold leading-[1.04] tracking-[-.055em] text-[var(--text-primary)]">
            Know when your customer has paid.
          </h1>
          <p className="mt-5 max-w-[32rem] text-base leading-relaxed text-[var(--text-secondary)]">
            Share one checkout link. Customers pay into your wallet, and GressPay matches the payment receipt to their order.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm font-semibold">
            <Link href="/register" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--text-primary)] px-5 text-[var(--bg-page)]">
              Create an account <ArrowRight size={16} />
            </Link>
            <Link href="/checkout-preview" className="inline-flex min-h-12 items-center rounded-xl border border-[var(--border-color)] px-5 text-[var(--text-primary)]">Try the checkout</Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="flex justify-between px-6 pt-5 text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">
            <span>Regional coverage</span><span>South Asia</span>
          </div>
          <div className="flex justify-center" style={{backgroundImage: "radial-gradient(var(--border-color) 1px, transparent 1px)", backgroundSize: "16px 16px"}}>
            <InteractiveGlobe />
          </div>
          <figcaption className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--border-color)] px-6 py-4 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-teal-600" />Bangladesh wallets</span>
            <span>Planned · India, Pakistan, Nepal</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
