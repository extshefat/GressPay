import type { Metadata } from "next";
import { GlobeHero } from "@/features/marketing/components/GlobeHero";
import { RailsStrip } from "@/features/marketing/components/RailsStrip";
import { HowItWorks } from "@/features/marketing/components/HowItWorks";
import { GatewayWalkthrough } from "@/features/marketing/components/GatewayWalkthrough";
import { CompanionShowcase } from "@/features/marketing/components/CompanionShowcase";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { PricingSection } from "@/features/marketing/components/PricingSection";
import { SecuritySection } from "@/features/marketing/components/SecuritySection";
import { RatesCalculator } from "@/features/marketing/components/RatesCalculator";
import { DeveloperPreview } from "@/features/marketing/components/DeveloperPreview";
import { FAQSection } from "@/features/marketing/components/FAQSection";
import { CTASection } from "@/features/marketing/components/CTASection";
import { jsonLd, site } from "@/content/marketing";

export const metadata: Metadata = {
  title: `${site.name} — Collect bKash, Nagad & USDT into your wallets`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GlobeHero />
      <RailsStrip />
      <HowItWorks />
      <GatewayWalkthrough />
      <CompanionShowcase />
      <CountryCoverage />
      <RatesCalculator />
      <SecuritySection />
      <DeveloperPreview />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
