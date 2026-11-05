import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_CLIENT_HEADER,
  SESSION_CLIENT_VALUE,
  SESSION_COOKIE,
} from "@/lib/session-cookie";
import { fetchPhpUpstream, phpOriginCandidates, primaryPhpOrigin } from "@/lib/php-upstream";

const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "forwarded",
  "x-gresspay-client-ip",
]);

/** Next.js 15 App Router catch-all: params is always a Promise. */
type RouteContext = { params: Promise<{ path: string[] }> };

function looksLikeAuthGoogleUrl(segments: string[], method: string): boolean {
  return (
    method === "GET" &&
    segments[0] === "auth" &&
    segments[1] === "google" &&
    (segments[2] === "url" || segments.length === 2)
  );
}

async function readUpstreamBody(upstream: Response): Promise<{ buffer: ArrayBuffer; text: string }> {
  const buffer = await upstream.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  return { buffer, text };
}

function jsonUpstreamError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path: segments = [] } = await ctx.params;
  const incoming = new URL(req.url);
  const apiPath = `/api/v1/${segments.join("/")}${incoming.search}`;
  const method = req.method.toUpperCase();
  const preferred = primaryPhpOrigin();

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Only safe behind an ingress that appends/overwrites XFF and blocks direct access.
  const hops = Number(process.env.TRUSTED_PROXY_HOPS || "0");
  const chain = (req.headers.get("x-forwarded-for") || "").split(",").map((v) => v.trim());
  const client =
    Number.isInteger(hops) && hops > 0 && hops <= chain.length ? chain[chain.length - hops] : "";
  headers.set("x-gresspay-client-ip", isIP(client) ? client : "0.0.0.0");

  const hasAuth = Boolean(headers.get("authorization")?.trim());
  const sessionJwt = req.cookies.get(SESSION_COOKIE)?.value?.trim() || "";
  const usingCookieSession = !hasAuth && sessionJwt !== "" && sessionJwt.split(".").length === 3;

  if (usingCookieSession) {
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const clientHeader = req.headers.get(SESSION_CLIENT_HEADER) || "";
      if (clientHeader !== SESSION_CLIENT_VALUE) {
        return NextResponse.json(
          {
            error: {
              code: "CSRF",
              message: "Missing dashboard client header for cookie-authenticated request.",
            },
          },
          { status: 403 }
        );
      }
    }
    headers.set("Authorization", `Bearer ${sessionJwt}`);
  }

  const googleUrl = looksLikeAuthGoogleUrl(segments, method);
  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    // Hard ceiling so a dead PHP host cannot leave the login button spinning.
    signal: AbortSignal.timeout(googleUrl ? 8000 : 25000),
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const { response: upstream, origin } = await fetchPhpUpstream(apiPath, init, {
      retriesPerOrigin: googleUrl ? 1 : 0,
      perOriginTimeoutMs: googleUrl ? 2000 : 8000,
    });
    const { buffer, text } = await readUpstreamBody(upstream);
    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    const isJson = contentType.includes("application/json") || /^\s*[{[]/.test(text);

    if (upstream.status >= 502 && upstream.status <= 504 && !isJson) {
      return jsonUpstreamError(
        502,
        "PHP_GATEWAY",
        `GressPay API returned HTTP ${upstream.status} from ${origin}. Coolify: ensure the php container is Running and web GRESSPAY_PHP_URL matches the compose service (usually http://php:8080). Tried: ${phpOriginCandidates().join(", ")}.`
      );
    }

    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase())) {
        out.set(key, value);
      }
    });
    out.set("x-gresspay-php-origin", origin);
    return new NextResponse(buffer, {
      status: upstream.status,
      headers: out,
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const tried = phpOriginCandidates().join(", ");
    return jsonUpstreamError(
      502,
      timedOut ? "PHP_TIMEOUT" : "PHP_UNREACHABLE",
      timedOut
        ? `GressPay API timed out (preferred ${preferred}). PHP may be restarting. Tried: ${tried}.`
        : `GressPay PHP is not reachable from the web container. Preferred ${preferred}. Tried: ${tried}. In Coolify → web env set GRESSPAY_PHP_URL=http://php:8080 (compose service name), confirm php is Running, then Redeploy.`
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
