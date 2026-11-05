"use client";

import dynamic from "next/dynamic";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { coverage } from "@/content/marketing";

const InteractiveGlobe = dynamic(
  () => import("../3d/InteractiveGlobe").then((m) => m.InteractiveGlobe),
  { ssr: false, loading: () => <div className="flex h-80 items-center justify-center text-sm text-muted">Loading map…</div> }
);

export function CountryCoverage() {
  return (
    <MarketingBand id="coverage">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <MarketingHeader kicker={coverage.eyebrow} title={coverage.title} description={coverage.body} />
          <ul className="space-y-3">
            {coverage.regions.map((region) => (
              <li key={region.name} className="gp-surface p-4" data-elevation="raised">
                <p className="font-semibold text-ink">{region.name}</p>
                <p className="mt-1 text-sm text-muted">{region.detail}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-[20rem] justify-center overflow-hidden rounded-xl border border-border bg-ink-solid shadow-floating">
          <InteractiveGlobe />
        </div>
      </div>
    </MarketingBand>
  );
}
