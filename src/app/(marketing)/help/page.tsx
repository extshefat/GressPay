import type { Metadata } from "next";
import Link from "next/link";
import { MarketingBand, MarketingHeader } from "@/features/marketing/components/MarketingPage";
import { FAQSection } from "@/features/marketing/components/FAQSection";
import { site } from "@/content/marketing";

export const metadata: Metadata = {
  title: "Help",
  description: "Setup help for GressPay merchants: companion APK, wallets, webhooks and checkout.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <>
      <MarketingBand bordered={false} className="pt-16">
        <MarketingHeader
          kicker="Help"
          title="Get a checkout live"
          description="Most merchants: create a brand, add a wallet, download the companion, create a payment link, then watch the first SMS match."
        />
        <ol className="mx-auto max-w-2xl list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <Link href="/register" className="font-semibold text-accent">
              Create an account
            </Link>{" "}
            and verify email.
          </li>
          <li>Add a brand and at least one receiving gateway under Methods.</li>
          <li>
            <Link href="/download" className="font-semibold text-accent">
              Install the companion APK
            </Link>{" "}
            and pair a device key.
          </li>
          <li>Create a payment link and open it on a second phone to test.</li>
          <li>
            Questions? Email{" "}
            <a href={`mailto:${site.contactEmail}`} className="font-semibold text-accent">
              {site.contactEmail}
            </a>
            .
          </li>
        </ol>
      </MarketingBand>
      <FAQSection />
    </>
  );
}
