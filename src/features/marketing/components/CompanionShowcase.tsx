"use client";

import Link from "next/link";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { companion } from "@/content/marketing";
import { COMPANION_APK } from "@/lib/marketing/companion-download";
import { Button } from "@/components/ui/button";

export function CompanionShowcase() {
  return (
    <MarketingBand id="companion">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <MarketingHeader kicker={companion.eyebrow} title={companion.title} description={companion.body} />
          <p className="mb-6 text-xs text-muted">{companion.placeholderNote}</p>
          <Link href="/download">
            <Button type="button" size="md">
              Download {COMPANION_APK.versionLabel} · {COMPANION_APK.sizeLabel}
            </Button>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[18rem]">
          <div className="rounded-[1.75rem] border border-border-strong bg-ink-solid p-3 shadow-floating" aria-label="Companion app preview placeholder">
            <div className="overflow-hidden rounded-[1.25rem] bg-surface text-ink">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                <span>GressPay Companion</span>
                <span className="text-success">{COMPANION_APK.mockStatusLabel}</span>
              </div>
              <div className="space-y-3 p-4">
                {companion.screens.map((screen) => (
                  <div key={screen.id} className="rounded-lg border border-border bg-card p-3 shadow-flat">
                    <p className="text-sm font-semibold">{screen.title}</p>
                    <p className="mt-1 text-xs text-muted">{screen.caption}</p>
                  </div>
                ))}
                <p className="text-center text-[10px] text-muted">Placeholder UI · Phase 6 ships native screens</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingBand>
  );
}
