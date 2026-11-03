"use client";

import { useEffect, useState } from "react";
import { Check, Pause, Play, Smartphone, Webhook } from "lucide-react";
import { gatewayLogoPath } from "@/lib/gateway-library";

const rails = [
  { code: "bkash", name: "bKash" }, { code: "nagad", name: "Nagad" },
  { code: "rocket", name: "Rocket" }, { code: "upay", name: "upay" },
  { code: "cellfin", name: "CellFin" },
];
const stages = [
  { label: "Checkout", title: "Customer selects a wallet", body: "Your brand, order amount and receiving rail stay together in one focused payment experience." },
  { label: "Receipt", title: "The paired phone sees the receipt", body: "The companion listens only for configured payment senders and sends the structured evidence securely." },
  { label: "Verify", title: "The server matches the evidence", body: "Wallet, exact amount, transaction reference and checkout window must agree before status can change." },
  { label: "Confirm", title: "Your store receives confirmation", body: "GressPay records the settlement once and delivers a signed webhook to your integration." },
];

export function GatewayWalkthrough() {
  const [step, setStep] = useState(0);
  const [rail, setRail] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % stages.length), 4200);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section className="gp-walk">
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-7 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">See every verification step</p>
            <h2 className="gp-rule-title mt-4 max-w-lg text-4xl font-semibold sm:text-5xl">From customer payment to trusted store event.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-300 lg:justify-self-end">This interactive sample explains the control flow. It never marks an order paid from a button click alone—the server waits for provider or receipt evidence.</p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-slate-700/80 bg-slate-700/80 lg:grid-cols-[1.05fr_.95fr]">
          <div className="bg-[#0c1826] p-5 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {rails.map((item, index) => (
                <button key={item.code} aria-pressed={rail === index} onClick={() => { setRail(index); setStep(0); }} className="gp-demo-button inline-flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gatewayLogoPath(item.code)} alt="" className="h-6 w-10 rounded-sm bg-white object-contain p-0.5" />
                  {item.name}
                </button>
              ))}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-[.9fr_1.1fr] sm:items-center">
              <div className="gp-demo-receipt" key={`${rail}-${step}`}>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gatewayLogoPath(rails[rail].code)} alt={rails[rail].name} className="h-8 w-16 object-contain" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order 0150</span>
                </div>
                <p className="mt-5 text-xs text-slate-500">Exact amount</p>
                <strong className="text-3xl tracking-tight">৳1,250.00</strong>
                <div className="mt-6 flex items-center justify-between rounded-md bg-slate-100 p-3 text-xs">
                  <span>{stages[step].label}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check size={13} /> In progress</span>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{rails[rail].name} · 0{step + 1}/04</p>
                <h3 className="text-2xl font-semibold tracking-tight">{stages[step].title}</h3>
                <p className="text-sm leading-6 text-slate-300">{stages[step].body}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a141f] p-5 sm:p-8">
            <div className="space-y-2">
              {stages.map((item, index) => (
                <button key={item.label} onClick={() => { setStep(index); setPlaying(false); }} aria-current={step === index ? "step" : undefined} className={`flex w-full items-center gap-4 rounded-md border p-4 text-left transition ${step === index ? "border-cyan-400/60 bg-cyan-400/10" : "border-slate-700/80 hover:border-slate-500"}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-bold ${step === index ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-400"}`}>0{index + 1}</span>
                  <span className="min-w-0"><strong className="block text-sm">{item.label}</strong><small className="mt-0.5 block truncate text-slate-400">{item.title}</small></span>
                  {index === 1 ? <Smartphone className="ml-auto h-4 w-4 text-slate-500" /> : index === 3 ? <Webhook className="ml-auto h-4 w-4 text-slate-500" /> : null}
                </button>
              ))}
            </div>
            <button onClick={() => setPlaying((value) => !value)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-600 px-4 text-xs font-semibold">
              {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause walkthrough" : "Play walkthrough"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
