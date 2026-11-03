import { GlobeHero } from "@/features/marketing/components/GlobeHero";
import { CountryCoverage } from "@/features/marketing/components/CountryCoverage";
import { GatewayWalkthrough } from "@/features/marketing/components/GatewayWalkthrough";
import { CompanionShowcase } from "@/features/marketing/components/CompanionShowcase";
import { PricingSection } from "@/features/marketing/components/PricingSection";
import { SecuritySection } from "@/features/marketing/components/SecuritySection";
import { RatesCalculator } from "@/features/marketing/components/RatesCalculator";
import { DeveloperPreview } from "@/features/marketing/components/DeveloperPreview";
import { FAQSection } from "@/features/marketing/components/FAQSection";
import { CTASection } from "@/features/marketing/components/CTASection";

export default function HomePage() {
  return (
    <>
      <GlobeHero />
      <GatewayWalkthrough />
      <CountryCoverage />
      <CompanionShowcase />
      <PricingSection />
      <SecuritySection />
      <RatesCalculator />
      <DeveloperPreview />
      <FAQSection />
      <CTASection />
    </>
  );
}
