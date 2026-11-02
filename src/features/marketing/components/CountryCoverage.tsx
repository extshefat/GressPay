import Link from "next/link";
import { gatewayLogoPath, GATEWAY_SHORT_LABELS } from "@/lib/gateway-library";

const groups = [
  {
    label: "Bangladesh · Live",
    detail: "Companion SMS matches TrxID + amount on wallets you configure.",
    status: "live" as const,
    codes: ["bkash", "nagad", "rocket", "upay", "cellfin", "ipay", "aamar_pay"],
  },
  {
    label: "Crypto · Live",
    detail: "USDT TRC-20 confirms on TronGrid. Binance Pay settles via merchant order API.",
    status: "live" as const,
    codes: ["usdt_trc20", "binance_pay", "bybit_pay"],
  },
  {
    label: "Asia · Preview",
    detail: "India UPI, Pakistan easypaisa, Nepal eSewa — catalog ready; live auto-verify planned.",
    status: "preview" as const,
    codes: ["upi_qr", "phonepe", "paytm", "easypaisa", "jazzcash", "esewa", "khalti"],
  },
];

export function CountryCoverage() {
  return (
    <section aria-labelledby="coverage-title" className="border-y border-[var(--border-color)] bg-[var(--bg-surface)] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Supported rails
        </p>
        <h2 id="coverage-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Automated message verify for Asia
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
          Live rails settle only with server-side evidence. Preview rails appear in the gateway library for upcoming countries.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.label}
              className="flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{group.label}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    group.status === "live"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
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
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] px-2 py-1.5 text-xs font-medium"
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
