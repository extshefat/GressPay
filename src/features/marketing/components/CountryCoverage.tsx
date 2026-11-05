import Link from "next/link";
import { gatewayLogoPath, GATEWAY_SHORT_LABELS } from "@/lib/gateway-library";

const groups = [
  {
    label: "Bangladesh wallets",
    detail: "Companion SMS matches TrxID + amount on wallets you configure.",
    status: "live" as const,
    codes: ["bkash", "nagad", "rocket", "upay", "cellfin"],
  },
  {
    label: "Crypto payments",
    detail: "USDT TRC-20 confirms on TronGrid. Binance Pay settles via merchant order API.",
    status: "live" as const,
    codes: ["usdt_trc20", "binance_pay"],
  },
  {
    label: "Regional catalog",
    detail: "Explore UPI in India, easypaisa in Pakistan and eSewa in Nepal. Automatic verification is planned.",
    status: "preview" as const,
    codes: ["upi_qr", "phonepe", "paytm", "easypaisa", "jazzcash", "esewa", "khalti"],
  },
];

export function CountryCoverage() {
  return (
    <section aria-labelledby="coverage-title" className="border-y border-[var(--border-color)] bg-[var(--bg-surface)] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="gp-section-label mb-3">
          Payment methods
        </p>
        <h2 id="coverage-title" className="gp-rule-title max-w-2xl text-3xl font-semibold sm:text-5xl">
          One checkout. The rails your customers already use.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
          Choose a method to match how your customers pay. Availability depends on the receiving accounts you connect.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--border-color)] md:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.label}
              className="flex min-h-[22rem] flex-col bg-[var(--bg-card)] p-6 sm:p-7"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{group.label}</h3>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    group.status === "live"
                      ? "bg-success/15 text-success dark:text-success"
                      : "bg-warning/15 text-warning dark:text-warning"
                  }`}
                >
                  {group.status}
                </span>
              </div>
              <p className="mb-5 mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                {group.detail}
              </p>
              <ul className="flex flex-wrap gap-2">
                {group.codes.map((code) => (
                  <li
                    key={code}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-page)] px-2 py-1.5 text-xs font-medium"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gatewayLogoPath(code)}
                      alt=""
                      className="h-7 w-9 rounded bg-white object-contain p-1"
                    />
                    {GATEWAY_SHORT_LABELS[code] || code}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <Link href="/developers" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
          Explore the checkout API →
        </Link>
      </div>
    </section>
  );
}
