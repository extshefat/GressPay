"use client";

import { useEffect, useState } from "react";
import { Check, Pause, Play, Smartphone, Webhook } from "lucide-react";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { walkthrough, rails } from "@/content/marketing";

const demoRails = rails.filter((r) => ["bkash", "nagad", "rocket", "upay", "cellfin"].includes(r.code));

export function GatewayWalkthrough() {
  const [step, setStep] = useState(0);
  const [rail, setRail] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stages = walkthrough.stages;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % stages.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing, stages.length]);

  return (
    <section className="border-b border-border bg-canvas text-ink" id="walkthrough" aria-labelledby="walkthrough-title">
      <div className="gp-container relative py-16 sm:py-24" data-width="marketing">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{walkthrough.eyebrow}</p>
            <h2 id="walkthrough-title" className="gp-display mt-4 max-w-lg text-4xl font-semibold text-ink sm:text-5xl">
              {walkthrough.title}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted lg:justify-self-end">{walkthrough.body}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 overflow-hidden rounded-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="gp-surface min-w-0 p-5 sm:p-8" data-elevation="raised">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sample rail">
              {demoRails.map((item, index) => (
                <button
                  key={item.code}
                  type="button"
                  aria-pressed={rail === index}
                  onClick={() => {
                    setRail(index);
                    setStep(0);
                  }}
                  className="gp-demo-button inline-flex items-center gap-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gatewayLogoPath(item.code)} alt="" className="h-6 w-10 rounded-sm bg-paper object-contain p-0.5" />
                  {item.name}
                </button>
              ))}
            </div>

            <div className="mt-7 grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
              <div className="gp-demo-receipt" key={`${rail}-${step}`}>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gatewayLogoPath(demoRails[rail].code)} alt={demoRails[rail].name} className="h-8 w-16 object-contain" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Order 0150</span>
                </div>
                <p className="mt-5 text-xs text-muted">Exact amount</p>
                <strong className="text-3xl tabular-nums tracking-tight" data-money>
                  ৳1,250.00
                </strong>
                <div className="mt-6 flex items-center justify-between rounded-md bg-surface p-3 text-xs">
                  <span>{stages[step].label}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <Check size={13} aria-hidden /> In progress
                  </span>
                </div>
              </div>
              <div className="space-y-3" aria-live="polite">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {demoRails[rail].name} · 0{step + 1}/0{stages.length}
                </p>
                <h3 className="text-2xl font-semibold tracking-tight">{stages[step].title}</h3>
                <p className="text-sm leading-relaxed text-muted">{stages[step].body}</p>
              </div>
            </div>
          </div>

          <div className="gp-surface min-w-0 p-5 sm:p-8" data-elevation="raised">
            <div className="space-y-2">
              {stages.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setStep(index);
                    setPlaying(false);
                  }}
                  aria-current={step === index ? "step" : undefined}
                  className={`flex w-full items-center gap-4 rounded-md border p-4 text-left text-ink transition ${
                    step === index ? "border-accent/60 bg-brand/10" : "border-border hover:border-border-strong"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold ${
                      step === index ? "bg-brand text-on-brand" : "bg-surface-muted text-muted"
                    }`}
                  >
                    0{index + 1}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-ink">{item.label}</strong>
                    <small className="mt-0.5 block truncate text-muted">{item.title}</small>
                  </span>
                  {index === 1 ? (
                    <Smartphone className="ml-auto h-4 w-4 text-muted" aria-hidden />
                  ) : index === 3 ? (
                    <Webhook className="ml-auto h-4 w-4 text-muted" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-4 text-xs font-semibold text-ink"
            >
              {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              {playing ? "Pause walkthrough" : "Play walkthrough"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
