import { isIP } from "node:net";
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
  "x-forwarded-for", "x-real-ip", "cf-connecting-ip", "forwarded",
  "x-gresspay-client-ip",
]);

/** Next.js 15 App Router catch-all: params is always a Promise. */
type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path: segments = [] } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${PHP_ORIGIN}/api/v1/${segments.join("/")}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Only safe behind an ingress that appends/overwrites XFF and blocks direct access.
  // Zero (default) intentionally aggregates clients rather than trusting arbitrary input.
  const hops = Number(process.env.TRUSTED_PROXY_HOPS || "0");
  const chain = (req.headers.get("x-forwarded-for") || "").split(",").map(v => v.trim());
  const client = Number.isInteger(hops) && hops > 0 && hops <= chain.length
    ? chain[chain.length - hops] : "";
  headers.set("x-gresspay-client-ip", isIP(client) ? client : "0.0.0.0");

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
