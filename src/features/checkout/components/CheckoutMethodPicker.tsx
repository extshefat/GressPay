"use client";
import { useId, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Bitcoin, CreditCard, Landmark, Smartphone } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/formatters";
import { gatewayLogoPath } from "@/lib/gateway-library";
import type { CheckoutSession, PaymentMethod } from "@/lib/types/api";
import { methodKey, paymentCategory, PAYMENT_CATEGORIES, type PaymentCategory } from "../checkoutMachine";

const icons = { mobile: Smartphone, crypto: Bitcoin, india: CreditCard, bank: Landmark, other: CreditCard };
export function CheckoutMethodPicker({ session, onChoose }: { session: CheckoutSession; onChoose: (method: PaymentMethod) => void }) {
  const methods = session.availableMethods;
  const [category, setCategory] = useState<PaymentCategory>(() => methods[0] ? paymentCategory(methods[0]) : "mobile");
  const id = useId();
  const categories = [...PAYMENT_CATEGORIES, ...(methods.some(method => paymentCategory(method) === "other") ? [{ id: "other" as const, label: "Other methods", detail: "Connected payment rails" }] : [])];
  const selected = categories.find(item => item.id === category)!;
  const visible = methods.filter(method => paymentCategory(method) === category);
  return <div className="space-y-6" data-checkout-step="choose">
    <Tabs id={id} panelId={`${id}-panel`} label="Payment categories" variant="cards" value={category} onChange={value => setCategory(value as PaymentCategory)} tabs={categories.map(item => {
      const count = methods.filter(method => paymentCategory(method) === item.id).length;
      const Icon = icons[item.id];
      return { id: item.id, disabled: !count, label: <span className="flex items-start gap-2.5"><Icon aria-hidden size={18} className="mt-0.5 shrink-0 text-accent"/><span className="min-w-0"><span className="block text-sm font-semibold text-ink">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{count ? item.detail : "Not available for this checkout"}</span></span></span> };
    })}/>
    <section id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${category}`} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{selected.label}</h3><p className="text-xs text-muted">Choose your payment method</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map(method => <button key={methodKey(method)} type="button" className="group flex min-h-24 min-w-0 items-center gap-3 rounded-lg border border-border-strong bg-card p-4 text-left shadow-flat transition-colors hover:border-brand hover:bg-brand-soft" onClick={() => onChoose(method)} data-rail={method.code}>
          <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-sm bg-on-ink p-1.5"><Image src={gatewayLogoPath(method.code)} alt="" width={58} height={36} className="h-9 w-14 object-contain" unoptimized/></span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{method.name}</span><span className="mt-1 block text-xs tabular-nums text-muted">{formatCurrency(method.payableAmount ?? session.amount, method.payableCurrency ?? method.currency, { maximumFractionDigits: 8 })}</span>{method.accountType && <span className="mt-1 block text-xs capitalize text-muted">{method.accountType} account</span>}</span>
          <ArrowUpRight aria-hidden size={16} className="shrink-0 text-accent"/>
        </button>)}
      </div>
      {!visible.length && <p className="rounded-md border border-border p-4 text-sm text-muted">No connected payment method is available in this category. Contact the merchant.</p>}
    </section>
  </div>;
}
