import { GlobeHero } from "@/features/marketing/components/GlobeHero";
import { LiveTicker } from "@/features/marketing/components/LiveTicker";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { HowItWorks } from "@/features/marketing/components/HowItWorks";
import { CompanionShowcase } from "@/features/marketing/components/CompanionShowcase";
import { SecuritySection } from "@/features/marketing/components/SecuritySection";
import { RatesCalculator } from "@/features/marketing/components/RatesCalculator";
import { DeveloperPreview } from "@/features/marketing/components/DeveloperPreview";
import { FAQSection } from "@/features/marketing/components/FAQSection";
import { CTASection } from "@/features/marketing/components/CTASection";

export default function HomePage() {
  return (
    <>
      <GlobeHero />
      <LiveTicker />
      <CountryCoverage />
      <HowItWorks />
      <CompanionShowcase />
      <SecuritySection />
      <RatesCalculator />
      <DeveloperPreview />
      <FAQSection />
      <CTASection />
    </>
  );
}
