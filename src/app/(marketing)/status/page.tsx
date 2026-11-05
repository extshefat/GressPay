import type { Metadata } from "next";
import { MarketingBand, MarketingHeader } from "@/features/marketing/components/MarketingPage";

export const metadata: Metadata = {
  title: "Status",
  description: "GressPay service status for checkout, companion ingest and webhooks.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  return (
    <MarketingBand bordered={false} className="py-16">
      <MarketingHeader
        kicker="Status"
        title="Operational overview"
        description="This page is a static operator note. Live incident banners appear in the dashboard when the platform posts them. No invented uptime percentages."
      />
      <ul className="mx-auto max-w-2xl space-y-3">
        {[
          { name: "Hosted checkout", detail: "Session create, TrxID submit, status poll" },
          { name: "Companion ingest", detail: "Device auth and SMS field upload" },
          { name: "Webhooks", detail: "HMAC delivery queue and retries" },
          { name: "Crypto verify", detail: "USDT TronGrid and Binance order checks" },
        ].map((row) => (
          <li key={row.name} className="gp-surface flex items-start justify-between gap-4 p-4" data-elevation="raised">
            <div>
              <p className="font-semibold text-ink">{row.name}</p>
              <p className="mt-1 text-sm text-muted">{row.detail}</p>
            </div>
            <span className="shrink-0 rounded-md bg-success/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
              Monitor
            </span>
          </li>
        ))}
      </ul>
    </MarketingBand>
  );
}
