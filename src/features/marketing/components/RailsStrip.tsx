"use client";

import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { rails } from "@/content/marketing";

export function RailsStrip() {
  return (
    <MarketingBand id="rails">
      <MarketingHeader
        kicker="Supported rails"
        title="Real wallets. Real verification paths."
        description="Logos are the official assets from public/methods. Each line states how GressPay confirms payment today."
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rails.map((rail) => (
          <li key={rail.code} className="gp-surface flex items-center gap-3 p-4" data-elevation="raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gatewayLogoPath(rail.code)} alt="" className="h-8 w-14 object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{rail.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{rail.verify}</p>
            </div>
          </li>
        ))}
      </ul>
    </MarketingBand>
  );
}
