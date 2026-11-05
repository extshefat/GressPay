import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_CLIENT_HEADER,
  SESSION_CLIENT_VALUE,
  SESSION_COOKIE,
} from "@/lib/session-cookie";

const PHP_ORIGIN = process.env.GRESSPAY_PHP_URL || "http://php:8080";
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
]);

/** Client-controlled forwarding headers — never pass through to PHP. */
const STRIP_CLIENT_IP = new Set([
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "forwarded",
  "x-gresspay-client-ip",
]);

/**
 * Coolify/Traefik append the previous hop to X-Forwarded-For.
 * The rightmost address is the immediate peer; the client is one hop left of the edge.
 * We take the rightmost public-looking hop when possible, else the rightmost value.
 */
function clientIpFromRequest(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const parts = xff
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 0) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const cand = parts[i];
      if (cand && !isPrivateOrLocal(cand)) {
        return cand;
      }
    }
    return parts[parts.length - 1];
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "0.0.0.0";
}

function isPrivateOrLocal(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "127.0.0.1" || v === "::1" || v === "0.0.0.0") return true;
  if (v.startsWith("10.") || v.startsWith("192.168.") || v.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:")) return true;
  return false;
}

/** Next.js 15 App Router catch-all: params is always a Promise. */
type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path: segments = [] } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${PHP_ORIGIN}/api/v1/${segments.join("/")}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (HOP.has(lk) || STRIP_CLIENT_IP.has(lk)) {
      return;
    }
    headers.set(key, value);
  });

  // Single trusted client IP for PHP (only honored when REMOTE_ADDR is a trusted proxy).
  headers.set("X-GressPay-Client-IP", clientIpFromRequest(req));

  const hasAuth = Boolean(headers.get("authorization")?.trim());
  const sessionJwt = req.cookies.get(SESSION_COOKIE)?.value?.trim() || "";
  const usingCookieSession = !hasAuth && sessionJwt !== "" && sessionJwt.split(".").length === 3;

  if (usingCookieSession) {
    const method = req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const client = req.headers.get(SESSION_CLIENT_HEADER) || "";
      if (client !== SESSION_CLIENT_VALUE) {
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
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase())) {
        out.set(key, value);
      }
    });
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "PHP_UNREACHABLE",
          message:
            "GressPay PHP is not reachable at GRESSPAY_PHP_URL (expected http://<api-service>:8080).",
        },
      },
      { status: 502 }
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
