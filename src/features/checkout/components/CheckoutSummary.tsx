"use client";
import Image from "next/image";
import { Clock, ExternalLink, Mail, Phone, ReceiptText } from "lucide-react";
import { GpMark } from "@/components/brand/GpMark";
import { formatCurrency } from "@/lib/formatters";
import type { CheckoutSession, PaymentMethod } from "@/lib/types/api";
import { formatSessionClock, type CheckoutPhase } from "../checkoutMachine";

function website(value?: string | null): string | undefined {
  if (!value) return;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return; }
}
export function CheckoutSummary({ session, method, secondsLeft, demoMode, phase }: { session: CheckoutSession; method?: PaymentMethod; secondsLeft: number; demoMode: boolean; phase: CheckoutPhase }) {
  const site = website(session.websiteUrl);
  const closed = ["success", "expired", "failed", "refunded", "cancelled"].includes(phase);
  const amount = phase === "success" ? session.settledAmount ?? method?.payableAmount ?? session.amount : method?.payableAmount ?? session.amount;
  const currency = phase === "success" ? session.settledCurrency ?? method?.payableCurrency ?? method?.currency ?? session.currency : method?.payableCurrency ?? method?.currency ?? session.currency;
  return <aside className="min-w-0 space-y-4 border-b border-border bg-surface p-4 sm:p-6 min-[900px]:border-b-0 min-[900px]:border-r" aria-label="Order summary">
    <div className="hidden items-center gap-2 text-xs font-semibold tracking-wide text-muted min-[900px]:flex"><GpMark size="sm"/><span>GressPay checkout</span></div>
    <div className="flex items-start gap-3">
      {session.merchantLogo ? <Image src={session.merchantLogo} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded-md border border-border bg-on-ink object-contain p-1"/> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-accent"><ReceiptText size={20} aria-hidden/></span>}
      <div className="min-w-0"><p className="text-xs text-muted">Paying to</p><h1 className="mt-1 break-words text-lg font-semibold leading-7">{session.merchantName}</h1></div>
    </div>
    <div className="border-y border-border py-3"><p className="text-xs font-medium text-muted">{closed ? "Checkout amount" : method ? "Exact amount due" : "Order total"}</p><p className="mt-2 break-words text-3xl font-semibold leading-tight tracking-tight tabular-nums" data-money>{formatCurrency(amount, currency, { maximumFractionDigits: 8 })}</p><p className="mt-3 break-words text-sm leading-6 text-muted">{session.orderTitle || "Payment"}</p></div>
    {closed ? <p className={`rounded-md border border-border bg-card p-3 text-sm font-semibold ${phase === "success" ? "text-success" : "text-muted"}`}>{phase === "success" ? "Payment confirmed" : phase === "expired" ? "Payment window ended" : phase === "refunded" ? "Payment refunded" : "Checkout closed"}</p> : <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3"><span className="flex items-center gap-2 text-xs text-muted"><Clock size={16} aria-hidden/>Payment window</span><span role="timer" aria-live="off" aria-label={`Time remaining ${formatSessionClock(secondsLeft)}`} className="font-mono text-sm font-semibold tabular-nums">{formatSessionClock(secondsLeft)}</span></div>}
    <p className="text-xs leading-6 text-muted">Paid directly to the merchant’s wallet. GressPay never holds your money.</p>
    <details className="rounded-md border border-border bg-card p-3"><summary className="cursor-pointer text-xs font-semibold">Order details</summary><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted">Invoice reference</dt><dd className="mt-1 break-all font-mono">{session.sessionId}</dd></div><div><dt className="text-muted">Original order amount</dt><dd className="mt-1 tabular-nums">{formatCurrency(session.amount, session.currency)}</dd></div>{method && <div><dt className="text-muted">Payment method</dt><dd className="mt-1">{method.name}</dd></div>}<div><dt className="text-muted">Fees</dt><dd className="mt-1 leading-5">{method ? "The exact amount shown includes the configured merchant and gateway charges. Your wallet provider may charge separately." : "Any configured charges are included in each method’s displayed total."}</dd></div></dl></details>
    {(session.supportMobile || session.supportEmail || site) && <div className="space-y-3 border-t border-border pt-4"><p className="text-xs font-semibold">Contact the merchant</p><div className="flex flex-wrap gap-4 text-xs font-medium text-accent">{session.supportMobile && <a className="flex min-h-9 items-center gap-1.5" href={`tel:${session.supportMobile.replace(/[^+\d]/g, "")}`}><Phone size={14} aria-hidden/>Call</a>}{session.supportEmail && <a className="flex min-h-9 items-center gap-1.5" href={`mailto:${session.supportEmail}`}><Mail size={14} aria-hidden/>Email</a>}{site && <a className="flex min-h-9 items-center gap-1.5" href={site} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden/>Website</a>}</div></div>}
    {(demoMode || session.ledgerMode === "test") && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs font-medium leading-6 text-warning">{demoMode ? "Illustrative checkout. Do not transfer money to any example destination." : "Test checkout. This is not a live payment request."}</p>}
  </aside>;
}
