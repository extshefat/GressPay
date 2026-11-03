"use client";
import { useEffect, useState } from "react";
import { gatewayLogoPath } from "@/lib/gateway-library";
const rails = [{code:"bkash",name:"bKash"},{code:"nagad",name:"Nagad"},{code:"rocket",name:"Rocket"},{code:"upay",name:"upay"},{code:"cellfin",name:"CellFin"}];
const stages = [
  ["Checkout", "The buyer chooses a wallet", "The checkout shows the receiving account and amount due."],
  ["Receipt", "The paired phone receives an SMS", "GressPay reads the incoming payment receipt from the configured sender."],
  ["Verify", "The server matches the order", "The receiving wallet, transaction reference and amount must match."],
  ["Confirm", "The store gets confirmation", "The server records the payment and sends a signed webhook to the store."]
];
export function GatewayWalkthrough(){
  const [step,setStep] = useState(0),[rail,setRail] = useState(0),[playing,setPlaying] = useState(false);
  useEffect(()=>{setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)},[]);
  useEffect(()=>{if(!playing)return;const t=setInterval(()=>setStep(s=>(s+1)%stages.length),4500);return ()=>clearInterval(t)},[playing]);
  return <section className="gp-walk"><div className="mx-auto max-w-6xl px-5 py-14">
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Interactive demo · sample order</p>
    <h2 className="mb-6 mt-3 text-3xl font-semibold">How GressPay verifies a payment</h2>
    <div className="flex flex-wrap gap-2">{rails.map((r,i)=><button key={r.code} aria-pressed={rail===i} onClick={()=>{setRail(i);setStep(0)}} className="gp-demo-button">{r.name}</button>)}</div>
    <div className="my-5 grid grid-cols-2 gap-2 md:grid-cols-4">{stages.map(([label],i)=><button key={label} className="gp-demo-button" aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false)}}>0{i+1} · {label}</button>)}</div>
    <div className="grid items-center gap-8 border border-slate-700 bg-slate-900 p-6 md:grid-cols-[.8fr_1fr]">
      <div className="gp-demo-receipt" key={rail+"-"+step}><img src={gatewayLogoPath(rails[rail].code)} alt={rails[rail].name} width={70} height={40}/><p className="mt-5 text-xs">ORDER GP-0150</p><strong className="text-3xl">৳150.00</strong><p className="mt-4 border-t pt-2 text-sm">{stages[step][0]}</p></div>
      <div><p className="text-sm text-blue-300">{rails[rail].name} · Step {step+1} of 4</p><h3 className="my-3 text-2xl font-semibold">{stages[step][1]}</h3><p>{stages[step][2]}</p><button onClick={()=>setPlaying(!playing)} className="mt-5 underline">{playing?"Pause demo":"Play demo"}</button></div>
    </div>
  </div></section>
}
