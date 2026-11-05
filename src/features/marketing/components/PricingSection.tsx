"use client";

import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { PricingPlans } from "./PricingPlans";
import { pricing } from "@/content/marketing";

export function PricingSection({ showTitle = true }: { showTitle?: boolean }) {
  return (
    <MarketingBand id="pricing">
      {showTitle && (
        <MarketingHeader kicker={pricing.eyebrow} title={pricing.title} description={pricing.subtitle} />
      )}
      <PricingPlans />
    </MarketingBand>
  );
}
