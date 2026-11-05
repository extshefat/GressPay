import { NextRequest, NextResponse } from "next/server";
import { fetchPhpUpstream } from "@/lib/php-upstream";
import { publicAppOrigin } from "@/lib/public-app-origin";

/**
 * Browser navigates here directly (no client fetch hang).
 * On success → 302 to Google. On failure → back to login/register with ?google_error=.
 */
export async function GET(req: NextRequest) {
  const incoming = req.nextUrl;
  const siteOrigin = publicAppOrigin(req);
  const returnTo = safeReturnPath(incoming.searchParams.get("return") || "/login");
  const redirectUri =
    incoming.searchParams.get("redirect_uri")?.trim() || `${siteOrigin}/callback/google`;

  const fail = (message: string) => {
    const dest = new URL(returnTo, siteOrigin);
    dest.searchParams.set("google_error", message.slice(0, 280));
    return NextResponse.redirect(dest, 303);
  };

  // Reject clearly-broken OAuth redirect targets (Docker bind / loopback).
  try {
    const ru = new URL(redirectUri);
    if (["0.0.0.0", "127.0.0.1", "localhost"].includes(ru.hostname)) {
      return fail("Invalid Google redirect URI. Open the site via https://gresspay.extxcheats.com");
    }
  } catch {
    return fail("Invalid Google redirect URI.");
  }

  try {
    const qs = new URLSearchParams({ redirect_uri: redirectUri });
    const { response } = await fetchPhpUpstream(
      `/api/v1/auth/google/url?${qs}`,
      {
        method: "GET",
        redirect: "manual",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
      { retriesPerOrigin: 1, perOriginTimeoutMs: 2000 }
    );

    const text = await response.text();
    let data: {
      enabled?: boolean;
      url?: string;
      reason?: string;
      error?: { message?: string };
    } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return fail("GressPay API returned a non-JSON response while starting Google sign-in.");
    }

    if (!response.ok) {
      return fail(
        data.error?.message ||
          data.reason ||
          `Google sign-in failed (HTTP ${response.status}). Check that the php container is Running.`
      );
    }

    if (!data.enabled || !data.url) {
      return fail(
        data.reason ||
          "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the php service."
      );
    }

    if (!/^https:\/\/accounts\.google\.com\//i.test(data.url)) {
      return fail("Google sign-in returned an unexpected redirect URL.");
    }

    return NextResponse.redirect(data.url, 302);
  } catch {
    return fail(
      "Could not reach the GressPay API to start Google sign-in. Coolify → php container must be Running (not Exited/unhealthy). Web env GRESSPAY_PHP_URL=http://php:8080. Open /api/ops/php-reachability"
    );
  }
}

function safeReturnPath(raw: string): string {
  if (raw === "/register" || raw.startsWith("/register?")) return raw;
  if (raw === "/login" || raw.startsWith("/login?")) return raw;
  return "/login";
}
