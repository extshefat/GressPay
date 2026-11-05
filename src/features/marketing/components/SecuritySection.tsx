"use client";

import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { security } from "@/content/marketing";

export function SecuritySection() {
  return (
    <MarketingBand id="security">
      <MarketingHeader kicker={security.eyebrow} title={security.title} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {security.items.map((item) => (
          <li key={item.title} className="gp-surface p-5" data-elevation="raised">
            <h3 className="text-base font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </MarketingBand>
  );
}
