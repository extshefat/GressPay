"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Tilt3D, RailChip3D, Card } from "@/components/ui";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { hero, rails } from "@/content/marketing";

const heroRails = rails.filter((r) =>
  ["bkash", "nagad", "rocket", "upay", "usdt_trc20", "binance_pay"].includes(r.code)
);

export function GlobeHero() {
  return (
    <section className="gp-texture relative overflow-hidden border-b border-border">
      <div className="gp-container grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20" data-width="marketing">
        <div className="min-w-0 text-left">
          <p className="gp-eyebrow">{hero.eyebrow}</p>
          <h1 className="gp-display mt-5 max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.4rem)] font-semibold tracking-[-0.04em] text-ink">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{hero.subline}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={hero.primary.href}>
              <span className="gp-button inline-flex min-h-12 items-center gap-2 px-6 text-sm" data-variant="primary">
                {hero.primary.label} <ArrowRight size={16} aria-hidden />
              </span>
            </Link>
            <Link href={hero.secondary.href}>
              <span className="gp-button inline-flex min-h-12 items-center px-6 text-sm" data-variant="secondary">
                {hero.secondary.label}
              </span>
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted">
            {hero.trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <Check size={14} className="text-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <div className="pointer-events-none absolute -left-2 top-8 hidden gap-3 lg:flex lg:flex-col">
            {heroRails.slice(0, 3).map((rail) => (
              <RailChip3D key={rail.code} code={rail.code} name={rail.name} isometric className="scale-90" />
            ))}
          </div>
          <div className="pointer-events-none absolute -right-2 bottom-10 hidden gap-3 lg:flex lg:flex-col">
            {heroRails.slice(3).map((rail) => (
              <RailChip3D key={rail.code} code={rail.code} name={rail.name} isometric className="scale-90" />
            ))}
          </div>

          <Tilt3D className="relative z-10">
            <Card elevation="floating" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                <span className="inline-flex items-center gap-2">
                  <i className="h-2 w-2 rounded-full bg-brand" aria-hidden />
                  {hero.heroNote}
                </span>
                <span>GP-DEMO-150</span>
              </div>
              <div className="grid sm:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-border p-5 sm:border-b-0 sm:border-r sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Checkout total</p>
                  <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight" data-money>
                    ৳1,250.00
                  </p>
                  <p className="mt-1 text-xs text-muted">Your Store · Order #150</p>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    Payment goes directly to the merchant&apos;s wallet. GressPay only verifies evidence.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {["bkash", "nagad", "rocket", "upay"].map((code, index) => (
                      <div
                        key={code}
                        className={`relative flex min-h-14 items-center justify-center rounded-md border bg-paper p-2 ${
                          index === 0 ? "border-accent ring-2 ring-accent/15" : "border-border"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={gatewayLogoPath(code)} alt={code} className="h-7 w-16 object-contain" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-md bg-ink-solid px-4 py-3 text-center text-xs font-bold text-on-ink dark:bg-brand dark:text-on-brand">
                    Continue with bKash
                  </div>
                </div>
                <div className="space-y-3 bg-surface p-5 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pay ৳1,250.00</p>
                  <div className="rounded-md border border-border bg-card p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted">Wallet</p>
                    <p className="mt-1 font-mono text-sm tabular-nums">01XXXXXXXXX</p>
                  </div>
                  <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
                    <li>Open bKash and send the exact amount.</li>
                    <li>Copy the TrxID from the confirmation SMS.</li>
                    <li>Paste it below — server matches SMS evidence.</li>
                  </ol>
                  <div className="rounded-md border border-dashed border-border-strong px-3 py-2 font-mono text-xs text-muted">
                    TrxID · e.g. 8X2K9M1P0Q
                  </div>
                </div>
              </div>
            </Card>
          </Tilt3D>
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
            {heroRails.map((rail) => (
              <RailChip3D key={rail.code} code={rail.code} name={rail.name} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
