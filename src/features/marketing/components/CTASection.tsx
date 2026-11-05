"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingBand } from "./MarketingPage";
import { cta } from "@/content/marketing";

export function CTASection() {
  return (
    <MarketingBand id="cta" bordered={false} className="bg-surface">
      <div className="gp-surface mx-auto max-w-3xl px-6 py-10 text-center sm:px-10" data-elevation="floating">
        <h2 className="gp-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{cta.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">{cta.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={cta.primary.href}>
            <span className="gp-button inline-flex min-h-12 items-center gap-2 px-6 text-sm" data-variant="primary">
              {cta.primary.label} <ArrowRight size={16} aria-hidden />
            </span>
          </Link>
          <Link href={cta.secondary.href}>
            <span className="gp-button inline-flex min-h-12 items-center px-6 text-sm" data-variant="secondary">
              {cta.secondary.label}
            </span>
          </Link>
        </div>
      </div>
    </MarketingBand>
  );
}
