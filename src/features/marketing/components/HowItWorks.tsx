"use client";

import Link from "next/link";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { howItWorks } from "@/content/marketing";

export function HowItWorks() {
  return (
    <MarketingBand id="how-it-works">
      <MarketingHeader kicker={howItWorks.eyebrow} title={howItWorks.title} description={howItWorks.subtitle} />
      <ol className="grid gap-4 md:grid-cols-3">
        {howItWorks.steps.map((step, index) => (
          <li key={step.id} className="gp-surface relative p-5 sm:p-6" data-elevation="raised">
            <span className="font-mono text-xs font-bold text-accent">0{index + 1}</span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-muted">
        Ready for SMS auto-match?{" "}
        <Link href="/download" className="font-semibold text-accent underline-offset-4 hover:underline">
          Download the companion APK
        </Link>
        .
      </p>
    </MarketingBand>
  );
}
