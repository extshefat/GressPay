import { NextRequest, NextResponse } from "next/server";

const PHP_ORIGIN = process.env.GRESSPAY_PHP_URL || "http://127.0.0.1:8080";
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
            "GressPay PHP is not running. Start it with: php -S 127.0.0.1:8080 -t backend/public backend/public/index.php",
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
