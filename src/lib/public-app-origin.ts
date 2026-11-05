import type { NextRequest } from "next/server";

const FALLBACK = "https://gresspay.extxcheats.com";

function isBadHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "" ||
    h === "0.0.0.0" ||
    h === "127.0.0.1" ||
    h === "localhost" ||
    h === "::" ||
    h === "[::]" ||
    h === "::1"
  );
}

function fromEnv(): string | null {
  for (const key of ["NEXT_PUBLIC_APP_URL", "APP_URL", "PUBLIC_APP_URL"] as const) {
    const raw = (process.env[key] || "").trim().replace(/\/$/, "");
    if (!raw) continue;
    try {
      const u = new URL(raw);
      if (!isBadHost(u.hostname)) return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Public site origin for browser redirects.
 * Never use Docker bind addresses (0.0.0.0 / localhost) from req.url.
 */
export function publicAppOrigin(req: NextRequest): string {
  const xfProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  const xfHost = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim();
  if (xfHost && !isBadHost(xfHost)) {
    const proto = xfProto === "http" || xfProto === "https" ? xfProto : "https";
    return `${proto}://${xfHost}`;
  }

  const host = (req.headers.get("host") || "").trim();
  if (host && !isBadHost(host)) {
    const proto = xfProto === "http" || xfProto === "https" ? xfProto : "https";
    return `${proto}://${host}`;
  }

  const referer = req.headers.get("referer") || "";
  if (referer) {
    try {
      const u = new URL(referer);
      if (!isBadHost(u.hostname)) return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }

  try {
    const u = new URL(req.url);
    if (!isBadHost(u.hostname)) return u.origin;
  } catch {
    /* ignore */
  }

  return fromEnv() || FALLBACK;
}
