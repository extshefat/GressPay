import type { Metadata } from "next";
import { PricingSection } from "@/features/marketing/components/PricingSection";
import { FAQSection } from "@/features/marketing/components/FAQSection";
import { MarketingBand, MarketingHeader } from "@/features/marketing/components/MarketingPage";

export const metadata: Metadata = {
  title: "Pricing",
  description: "GressPay plans: Trial, Starter, Pro and Enterprise Lifetime. 0% platform commission — customers pay your wallet.",
  alternates: { canonical: "/fees" },
};

export default function FeesPage() {
  return (
    <>
      <MarketingBand bordered={false} className="pt-10">
        <MarketingHeader
          kicker="Pricing"
          title="Transparent subscriptions"
          description="GressPay does not take a percentage of each transfer. Optional brand or gateway fees you configure are shown at checkout and are yours."
        />
      </MarketingBand>
      <PricingSection showTitle={false} />
      <FAQSection />
    </>
  );
}
