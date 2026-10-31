"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/ui/copy-field";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Lock,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { IntegrationSnippets } from "@/features/developers/IntegrationSnippets";

const API_BASE = "https://gresspay.extxcheats.com/api/v1";

const NAV = [
  { id: "base", label: "API base" },
  { id: "auth", label: "Authentication" },
  { id: "create", label: "Create payment" },
  { id: "verify", label: "Verify & status" },
  { id: "webhooks", label: "Webhooks" },
  { id: "snippets", label: "Language examples" },
  { id: "go-live", label: "Go-live checklist" },
] as const;

function FieldTable({
  rows,
}: {
  rows: { name: string; type: string; required?: boolean; description: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Field</th>
            <th className="px-4 py-2.5 font-semibold">Type</th>
            <th className="px-4 py-2.5 font-semibold">Required</th>
            <th className="px-4 py-2.5 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {rows.map((row) => (
            <tr key={row.name} className="bg-white dark:bg-zinc-950/40">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                {row.name}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{row.type}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                {row.required ? "Yes" : "No"}
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointBadge({ method, path }: { method: string; path: string }) {
  const color =
    method === "GET"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950";
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${color}`}>
        {method}
      </span>
      <code className="text-zinc-800 dark:text-zinc-200">{path}</code>
    </div>
  );
}

export default function DevelopersPage() {
  const [active, setActive] = useState<string>("base");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mb-12 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="cyan" dot>
            Developer Hub
          </Badge>
          <Badge variant="slate">REST API v1</Badge>
          <Badge variant="slate">Production</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Build with GressPay
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
          Create hosted checkout sessions, verify payments server-to-server, and receive
          HMAC-signed webhooks. Production base URL is fixed below — copy-paste ready for
          cURL, PHP, Laravel, Node/Next.js, and WordPress.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Get API keys
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <a
            href="#snippets"
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <Code2 className="mr-2 h-4 w-4" />
            View examples
          </a>
          <a
            href="/download/gresspay-psp-example.zip"
            className="inline-flex items-center rounded-xl border border-teal-600/30 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-100 dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/60"
          >
            Download PSP minimal sample
          </a>
        </div>
        <p className="text-xs text-zinc-500">
          Full walkthrough + source:{" "}
          <a
            href="https://github.com/extshefat/gresspay/tree/main/sdk/examples/psp-minimal"
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            sdk/examples/psp-minimal
          </a>
          . APK security notes:{" "}
          <a
            href="https://github.com/extshefat/gresspay/blob/main/docs/APK_SECURITY_REVIEW.md"
            className="font-semibold underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/APK_SECURITY_REVIEW.md
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <aside className="sticky top-20 space-y-1 rounded-2xl border border-zinc-200 bg-white p-3 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-3">
          <span className="block px-3 py-1 font-mono text-[10px] uppercase text-zinc-400">
            On this page
          </span>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActive(item.id)}
              className={`block rounded-lg px-3 py-2 transition ${
                active === item.id
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </a>
          ))}
        </aside>

        <div className="space-y-16 lg:col-span-9">
          <section id="base" className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                API base
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              All authenticated API routes live under this production host. Prefer the{" "}
              <code className="font-mono text-xs">/payment/*</code> aliases (they map to the
              same checkout handlers).
            </p>
            <CopyField value={API_BASE} label="Production API base" />
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Aliases: <code className="font-mono">POST /payment/create</code> →{" "}
              <code className="font-mono">POST /checkout/create</code>,{" "}
              <code className="font-mono">POST /payment/verify</code> → server-side verify,{" "}
              <code className="font-mono">GET /payment/status/{"{session_id}"}</code> → same
              verify payload.
            </div>
          </section>

          <section id="auth" className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Authentication
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Authenticate every server-side call with your brand website API key (
              <code className="font-mono">gp_live_…</code>). Never expose secret keys in browser
              JavaScript.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Preferred
                </div>
                <code className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  Authorization: Bearer gp_live_…
                </code>
              </div>
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Alternates
                </div>
                <code className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  X-API-Key / X-GressPay-Key: gp_live_…
                </code>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Use the live website API key from{" "}
              <Link href="/dashboard/brands" className="font-semibold underline">
                Dashboard → Brands
              </Link>{" "}
              (prefix <code className="font-mono">gp_live_</code>). Never expose keys in browser-side code.
            </p>
          </section>

          <section id="create" className="space-y-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Create payment
              </h2>
            </div>
            <EndpointBadge method="POST" path={`${API_BASE}/payment/create`} />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Creates a hosted checkout session and returns a buyer URL. Scope required:{" "}
              <code className="font-mono text-xs">create_payment</code>.
            </p>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Request body</h3>
            <FieldTable
              rows={[
                { name: "amount", type: "string|number", required: true, description: "Positive amount (e.g. 500.00)." },
                { name: "currency", type: "string", required: true, description: "ISO code — typically BDT or USD." },
                { name: "order_id", type: "string", description: "Your internal order reference." },
                { name: "customer_name", type: "string", description: "Buyer display name (aliases: full_name, name)." },
                { name: "customer_email", type: "string", description: "Buyer email (aliases: email)." },
                { name: "success_url", type: "string", description: "Return URL after COMPLETED (aliases: return_url)." },
                { name: "cancel_url", type: "string", description: "Optional cancel destination." },
                { name: "webhook_url", type: "string", description: "HTTPS destination for signed events." },
                { name: "metadata", type: "object", description: "Arbitrary JSON echoed on webhooks/status." },
              ]}
            />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Response 201</h3>
            <FieldTable
              rows={[
                { name: "sessionId", type: "string", required: true, description: "Checkout session id (chs_…)." },
                { name: "payment_url", type: "string", required: true, description: "Hosted checkout URL (alias: payUrl)." },
                { name: "status", type: "string", required: true, description: "PENDING / INITIATED until paid." },
                { name: "amount", type: "number", required: true, description: "Session amount." },
                { name: "currency", type: "string", required: true, description: "Session currency." },
              ]}
            />
          </section>

          <section id="verify" className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Verify & status
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Never fulfill from the browser return URL alone. Confirm on your server before
              shipping. Scope: <code className="font-mono text-xs">verify_payment</code>.
            </p>
            <div className="space-y-3">
              <EndpointBadge method="POST" path={`${API_BASE}/payment/verify`} />
              <p className="text-xs text-zinc-500">
                Body: <code className="font-mono">{"{ \"sessionId\": \"chs_…\" }"}</code> (alias{" "}
                <code className="font-mono">session_id</code>).
              </p>
              <EndpointBadge method="GET" path={`${API_BASE}/payment/status/{session_id}`} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Status payload</h3>
            <FieldTable
              rows={[
                { name: "sessionId", type: "string", required: true, description: "Session identifier." },
                { name: "status", type: "string", required: true, description: "PENDING | COMPLETED | EXPIRED | FAILED." },
                { name: "amount", type: "number", required: true, description: "Locked session amount." },
                { name: "currency", type: "string", required: true, description: "Locked currency." },
                { name: "paymentMethod", type: "string", description: "Public method code when selected." },
                { name: "txid", type: "string", description: "Provider / MFS TrxID when available." },
                { name: "order_id", type: "string", description: "Your order id from create." },
                { name: "redirectUrl", type: "string", description: "Return URL with session query when COMPLETED." },
              ]}
            />
          </section>

          <section id="webhooks" className="space-y-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Webhooks
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              When a session completes, GressPay POSTs JSON to your{" "}
              <code className="font-mono text-xs">webhook_url</code>. Verify the signature before
              trusting the body.
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                Read the raw request body bytes (do not re-serialize JSON before verifying).
              </li>
              <li>
                Compute <code className="font-mono text-xs">HMAC-SHA256(rawBody, webhookSecret)</code>{" "}
                as hex.
              </li>
              <li>
                Compare to the <code className="font-mono text-xs">X-GressPay-Signature</code>{" "}
                header with a constant-time equals check.
              </li>
              <li>Only then parse JSON and fulfill if <code className="font-mono text-xs">status</code> is COMPLETED.</li>
              <li>Respond with HTTP 2xx quickly; retries are best-effort.</li>
            </ol>
            <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-100">
              <code>{`// Node.js
import crypto from "node:crypto";

export function verifyGressPayWebhook(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signatureHeader || "", "utf8")
  );
}`}</code>
            </pre>
          </section>

          <IntegrationSnippets />

          <section id="go-live" className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Go-live checklist
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {[
                "Copy the live brand website API key from Dashboard → Brands (server-side only).",
                "Configure bKash/Nagad wallets and companion devices for SMS matching.",
                "Set HTTPS webhook destinations and store the webhook secret securely.",
                "Fulfill only after POST /payment/verify (or webhook) shows COMPLETED.",
                "Enable crypto rails only after Binance / USDT credentials are encrypted in Methods.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900 dark:text-zinc-100" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
