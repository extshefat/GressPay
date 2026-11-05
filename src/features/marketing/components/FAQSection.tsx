"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MarketingBand, MarketingHeader } from "./MarketingPage";
import { faq } from "@/content/marketing";

export function FAQSection() {
  const baseId = useId();
  const [open, setOpen] = useState(0);

  return (
    <MarketingBand id="faq">
      <MarketingHeader kicker="FAQ" title="Straight answers for merchants and developers" />
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-xl border border-border bg-card shadow-raised">
        {faq.map((item, index) => {
          const panelId = `${baseId}-panel-${index}`;
          const buttonId = `${baseId}-button-${index}`;
          const expanded = open === index;
          return (
            <div key={item.q}>
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink"
                  onClick={() => setOpen(expanded ? -1 : index)}
                >
                  {item.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} aria-hidden />
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="px-5 pb-5 text-sm leading-relaxed text-muted">
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </MarketingBand>
  );
}
