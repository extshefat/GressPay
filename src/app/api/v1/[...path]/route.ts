import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_CLIENT_HEADER,
  SESSION_CLIENT_VALUE,
  SESSION_COOKIE,
} from "@/lib/session-cookie";

const PHP_ORIGIN = (process.env.GRESSPAY_PHP_URL || "http://php:8080").replace(/\/$/, "");
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

async function fetchUpstream(target: string, init: RequestInit, retries = 0): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const upstream = await fetch(target, init);
      if (upstream.status >= 502 && upstream.status <= 504 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return upstream;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upstream fetch failed");
}

async function proxy(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path: segments = [] } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${PHP_ORIGIN}/api/v1/${segments.join("/")}${incoming.search}`;
  const method = req.method.toUpperCase();

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

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    // Google URL / health should fail fast rather than hang the login button.
    signal: AbortSignal.timeout(looksLikeAuthGoogleUrl(segments, method) ? 15000 : 25000),
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const retries = looksLikeAuthGoogleUrl(segments, method) ? 2 : 0;
    const upstream = await fetchUpstream(target, init, retries);
    const { buffer, text } = await readUpstreamBody(upstream);
    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    const isJson = contentType.includes("application/json") || /^\s*[{[]/.test(text);

    // Traefik/nginx HTML 502 must never surface as a blank "API Error: 502".
    if (upstream.status >= 502 && upstream.status <= 504 && !isJson) {
      return jsonUpstreamError(
        502,
        "PHP_GATEWAY",
        `GressPay API returned HTTP ${upstream.status} from ${PHP_ORIGIN}. Check that the php service is healthy and GRESSPAY_PHP_URL points at http://<api-service>:8080 on the same Docker network.`
      );
    }

    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase())) {
        out.set(key, value);
      }
    });
    return new NextResponse(buffer, {
      status: upstream.status,
      headers: out,
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return jsonUpstreamError(
      502,
      timedOut ? "PHP_TIMEOUT" : "PHP_UNREACHABLE",
      timedOut
        ? `GressPay API timed out at ${PHP_ORIGIN}. The php container may be restarting or overloaded.`
        : `GressPay PHP is not reachable at GRESSPAY_PHP_URL (${PHP_ORIGIN}). On Coolify set GRESSPAY_PHP_URL=http://php:8080 (or your API service name) on the web service.`
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
