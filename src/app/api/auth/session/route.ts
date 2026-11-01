import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  TTL_DEFAULT_SEC,
  TTL_REMEMBER_SEC,
} from "@/lib/session-cookie";

function cookieSecure(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
}

/** Establish or refresh HttpOnly JWT session cookie for the dashboard browser. */
export async function POST(req: NextRequest) {
  let body: { token?: string; rememberMe?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "JSON body required." } },
      { status: 400 }
    );
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token === "" || token.split(".").length !== 3) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Valid JWT token required." } },
      { status: 400 }
    );
  }
  const rememberMe = Boolean(body.rememberMe);
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

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return NextResponse.json({ ok: Boolean(token && token.split(".").length === 3) });
}
