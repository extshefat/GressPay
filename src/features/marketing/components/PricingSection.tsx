"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Plan = { code: string; name: string; priceBdt: string; billingCycle: string; deviceLimit: number; checkoutLimit: number; websiteLimit: number };
export function PricingSection({ showTitle = true }: { showTitle?: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState("Loading current plans…");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/billing/catalog", { signal: controller.signal, cache: "no-store" })
      .then(async r => { if (!r.ok) throw Error(); return r.json(); })
      .then(data => { setPlans(data.plans); setStatus(data.plans.length ? "" : "No paid plans are currently available."); })
      .catch(() => { if (!controller.signal.aborted) setStatus("Prices could not be loaded."); });
    return () => controller.abort();
  }, [attempt]);
  return <section id="pricing" className="border-y border-[var(--border-color)] bg-[var(--bg-page)] py-16 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      {showTitle && <div className="mb-10 max-w-3xl"><p className="gp-section-label">Plans & billing</p><h2 className="gp-rule-title mt-3 text-4xl font-semibold sm:text-5xl">Scale by storefront, not by surprise fees.</h2><p className="mt-4 text-[var(--text-secondary)]">Every plan publishes the same verified checkout. Move up only when you need more websites, devices or completed orders.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[{code:"trial", name:"Trial", priceBdt:"0", billingCycle:"trial", websiteLimit:1, deviceLimit:1, checkoutLimit:50}, ...plans].map((plan,i) =>
          <article key={plan.code} className="gp-plan-card" style={{borderTopColor:["#7590b9","#397cdc","#8660ca","#cd8830"][i % 4]}}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{plan.billingCycle}</p>
            <h3 className="mt-2 text-2xl font-semibold">{plan.name}</h3>
            <p className="my-5 text-3xl font-semibold">৳{Number(plan.priceBdt).toLocaleString("en-BD")}</p>
            <ul className="mb-6 space-y-2 border-t border-[var(--border-color)] pt-4 text-sm">
              <li>{plan.websiteLimit} {plan.websiteLimit===1 ? "website" : "websites"}</li>
              <li>{plan.checkoutLimit ? plan.checkoutLimit + " completed checkouts / month" : "Unlimited completed checkouts"}</li>
              {plan.deviceLimit > 0 && <li>{plan.deviceLimit} paired {plan.deviceLimit===1 ? "phone" : "phones"}</li>}
              <li>Payment links and server verification</li>
            </ul>
            <Link href={plan.code==="trial" ? "/register" : "/register?plan="+encodeURIComponent(plan.code)} className="mt-auto block rounded-md border border-[var(--border-color)] bg-[var(--bg-page)] p-3 text-center text-sm font-semibold transition hover:border-[var(--text-primary)]">Choose {plan.name} →</Link>
          </article>)}
      </div>
      {status && <p role="status" className="mt-4 text-sm">{status} {status.startsWith("Prices") && <button className="underline" onClick={()=>setAttempt(attempt+1)}>Retry</button>}</p>}
    </div>
  </section>;
}
