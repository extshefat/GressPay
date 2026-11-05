import type { Metadata } from "next";
import Link from "next/link";
import { MarketingBand, MarketingHeader } from "@/features/marketing/components/MarketingPage";
import { RailsStrip } from "@/features/marketing/components/RailsStrip";
import { howItWorks, site } from "@/content/marketing";

export const metadata: Metadata = {
  title: "Services",
  description: site.description,
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <MarketingBand bordered={false} className="pt-16">
        <MarketingHeader
          kicker="Services"
          title="Verification for wallets you already use"
          description="Publish receiving numbers and crypto destinations. Pair the companion for MFS SMS match. Wire webhooks to fulfill orders when evidence lands."
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {howItWorks.steps.map((step) => (
            <li key={step.id} className="gp-surface p-5" data-elevation="raised">
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">
          Prefer docs first?{" "}
          <Link href="/developers" className="font-semibold text-accent underline-offset-4 hover:underline">
            Open the API guide
          </Link>
          .
        </p>
      </MarketingBand>
      <RailsStrip />
    </>
  );
}
