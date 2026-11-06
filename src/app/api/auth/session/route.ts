import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  TTL_DEFAULT_SEC,
  TTL_REMEMBER_SEC,
} from "@/lib/session-cookie";
import { fetchPhpUpstream } from "@/lib/php-upstream";

function cookieSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
}

const MAX_BODY_BYTES = 8192;
function tokenShape(token: unknown): token is string {
  if (typeof token !== "string" || token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  try {
    const [h, p] = token.split(".");
    const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    return header?.alg === "HS256" && header?.typ === "JWT" && typeof payload?.sub === "string" && payload.sub.length > 0
      && Number.isSafeInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

/** Bound actual streamed bytes too; Content-Length alone is client controlled. */
async function boundedJson(req: NextRequest): Promise<unknown> {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) throw new RangeError("Body too large");
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("JSON required");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Establish or refresh HttpOnly JWT session cookie for the dashboard browser. */
export async function POST(req: NextRequest) {
  let body: { token?: string; rememberMe?: boolean } = {};
  try {
    const parsed = await boundedJson(req);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new SyntaxError("Object required");
    body = parsed as typeof body;
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: { code: "BODY_TOO_LARGE", message: "Session body exceeds 8KB." } }, { status: 413 });
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "JSON body required." } },
      { status: 400 }
    );
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!tokenShape(token)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Valid JWT token required." } },
      { status: 400 }
    );
  }
  const rememberMe = body.rememberMe === true;
  const maxAge = rememberMe ? TTL_REMEMBER_SEC : TTL_DEFAULT_SEC;
  const res = NextResponse.json({ ok: true, rememberMe, expiresIn: maxAge });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

/** Clear dashboard session cookie. */
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

/** AUTH-03: shape alone is not enough — confirm the JWT with PHP /me. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!tokenShape(token)) {
    return NextResponse.json({ ok: false });
  }
  try {
    const { response } = await fetchPhpUpstream(
      "/api/v1/me",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(5000),
      },
      { retriesPerOrigin: 0, perOriginTimeoutMs: 2000 }
    );
    return NextResponse.json({ ok: response.ok });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
