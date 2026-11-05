/**
 * Resolve reachable GressPay PHP origins for the Next.js BFF.
 * Coolify compose service is usually `php`; docs also mention `gresspay-api`.
 * Mis-set GRESSPAY_PHP_URL (localhost / public URL) must not hard-fail Google login.
 */

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, "");
}

function isUsableOrigin(origin: string): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    // Loopback / Docker bind addresses are never valid cross-container PHP URLs.
    if (
      host === "0.0.0.0" ||
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "::1" ||
      host === "::"
    ) {
      return false;
    }
    // Public site / Cloudflare loop — Next must talk to the internal PHP service.
    if (host === "gresspay.extxcheats.com" || host.endsWith(".extxcheats.com")) {
      if (!host.startsWith("php") && !host.includes("api")) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Ordered unique candidates — env first, then Coolify compose aliases. */
export function phpOriginCandidates(): string[] {
  const envRaw = process.env.GRESSPAY_PHP_URL || "";
  const extras = (process.env.GRESSPAY_PHP_URL_FALLBACKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = ["http://php:8080", "http://gresspay-api:8080", "http://api:8080"];
  const ordered = [envRaw, ...extras, ...defaults]
    .map(normalizeOrigin)
    .filter(isUsableOrigin);
  return [...new Set(ordered)];
}

let cachedOrigin: string | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export function getCachedPhpOrigin(): string | null {
  if (cachedOrigin && Date.now() - cachedAt < CACHE_MS) return cachedOrigin;
  return null;
}

export function rememberPhpOrigin(origin: string): void {
  cachedOrigin = normalizeOrigin(origin);
  cachedAt = Date.now();
}

export function clearPhpOriginCache(): void {
  cachedOrigin = null;
  cachedAt = 0;
}

export function primaryPhpOrigin(): string {
  return getCachedPhpOrigin() || phpOriginCandidates()[0] || "http://php:8080";
}

export type ProbeResult = {
  origin: string;
  ok: boolean;
  status?: number;
  ms: number;
  error?: string;
  bodyOk?: boolean;
};

function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const viable = signals.filter(Boolean);
  if (viable.length === 0) return AbortSignal.timeout(8000);
  if (viable.length === 1) return viable[0];
  const any = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof any === "function") return any(viable);
  // Fallback: abort when the earliest signal aborts.
  const controller = new AbortController();
  for (const signal of viable) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/** Probe /api/v1/health on each candidate (liveness: any HTTP response counts). */
export async function probePhpOrigins(timeoutMs = 2500): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  for (const origin of phpOriginCandidates()) {
    const started = Date.now();
    try {
      const res = await fetch(`${origin}/api/v1/health`, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text().catch(() => "");
      const bodyOk = text.includes("GressPay") || text.includes('"ok"') || text.includes("product");
      results.push({
        origin,
        ok: res.status > 0 && res.status < 600,
        status: res.status,
        ms: Date.now() - started,
        bodyOk,
      });
      if (res.status > 0 && res.status < 500) {
        rememberPhpOrigin(origin);
      }
    } catch (err) {
      results.push({
        origin,
        ok: false,
        ms: Date.now() - started,
        error: err instanceof Error ? err.name || err.message : "fetch_failed",
      });
    }
  }
  return results;
}

/**
 * Fetch path `/api/v1/...` trying candidates until one responds (not network-dead).
 * Each origin gets its own short timeout so a blackholed host cannot stall Google login.
 */
export async function fetchPhpUpstream(
  apiPathAndQuery: string,
  init: RequestInit,
  opts?: { retriesPerOrigin?: number; perOriginTimeoutMs?: number }
): Promise<{ response: Response; origin: string }> {
  const path = apiPathAndQuery.startsWith("/") ? apiPathAndQuery : `/${apiPathAndQuery}`;
  const retries = opts?.retriesPerOrigin ?? 0;
  const perOriginTimeoutMs = opts?.perOriginTimeoutMs ?? 2500;
  const preferred = getCachedPhpOrigin();
  const origins = preferred
    ? [preferred, ...phpOriginCandidates().filter((o) => o !== preferred)]
    : phpOriginCandidates();

  const parentSignal = init.signal;
  let lastError: unknown;

  for (const origin of origins) {
    if (parentSignal?.aborted) break;
    const target = `${origin}${path}`;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (parentSignal?.aborted) break;
      const signal = mergeSignals([parentSignal, AbortSignal.timeout(perOriginTimeoutMs)].filter(Boolean) as AbortSignal[]);
      try {
        const response = await fetch(target, { ...init, signal });
        if (response.status >= 502 && response.status <= 504 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
          continue;
        }
        // Network path worked — cache even on 4xx/503 JSON from PHP itself.
        if (response.status < 502 || response.headers.get("content-type")?.includes("json")) {
          rememberPhpOrigin(origin);
          return { response, origin };
        }
        // HTML gateway 502 from wrong host — try next origin.
        if (response.status >= 502) {
          lastError = new Error(`HTTP ${response.status} from ${origin}`);
          break;
        }
        rememberPhpOrigin(origin);
        return { response, origin };
      } catch (err) {
        lastError = err;
        if (attempt < retries && !parentSignal?.aborted) {
          await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
          continue;
        }
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upstream fetch failed");
}
