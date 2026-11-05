import { createHash } from "node:crypto";
import { THEME_SCRIPT } from "./src/lib/theme-script";
import type { NextConfig } from "next";

/**
 * Production builds must talk to the real API. Mock/demo data must never ship
 * as an unlabeled "live" merchant experience.
 */
const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || "live";
if (process.env.NODE_ENV === "production" && dataSource !== "live") {
  throw new Error(
    "NEXT_PUBLIC_DATA_SOURCE must be set to \"live\" for production builds. " +
      "Mock merchant/payment data is only for local demo (omit the flag or use development)."
  );
}

const imageOrigins = ["https://gresspay.extxcheats.com", process.env.NEXT_PUBLIC_APP_URL, process.env.R2_PUBLIC_BASE_URL].filter((v): v is string => Boolean(v));
const remotePatterns = imageOrigins.flatMap(origin => {
  const url = new URL(origin);
  if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return [];
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Image origins must use HTTPS without credentials.");
  return [{ protocol: "https" as const, hostname: url.hostname, port: url.port, pathname: `${url.pathname.replace(/\/$/, "")}/**` }];
});
const themeHash = createHash("sha256").update(THEME_SCRIPT).digest("base64");
const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'",
  `script-src 'self' 'sha256-${themeHash}'`, "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:", "font-src 'self'", "connect-src 'self'",
  "form-action 'self'", "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
  async headers() {
    // Public /pay and /store pages remain embeddable for merchant integrations.
    // CSP is report-only until Next hydration and merchant/provider origins are reviewed.
    return [
      { source: "/:path*", headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Content-Security-Policy-Report-Only", value: csp },
      ] },
      ...["/login", "/register", "/verify-email", "/admin/:path*", "/overview", "/settings"].map(source => ({ source, headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ] })),
    ];
  },
  // (dashboard) is a route group — URLs are /overview etc.
  // Keep /dashboard/* working for nav + bookmarks.
  async rewrites() {
    return [{ source: "/dashboard/:path*", destination: "/:path*" }];
  },
  async redirects() {
    return [
      {
        source: "/downloads",
        destination: "/download",
        permanent: true,
      },
      {
        source: "/downloads/",
        destination: "/download",
        permanent: true,
      },
      {
        source: "/downloads/:path*",
        destination: "/download/:path*",
        permanent: true,
      },
      {
        source: "/pricing",
        destination: "/fees",
        permanent: true,
      },
      {
        source: "/pricing/",
        destination: "/fees",
        permanent: true,
      },
      {
        source: "/docs",
        destination: "/developers",
        permanent: true,
      },
      {
        source: "/docs/",
        destination: "/developers",
        permanent: true,
      },
      {
        source: "/companion",
        destination: "/download",
        permanent: true,
      },
      {
        source: "/companion/",
        destination: "/download",
        permanent: true,
      },
      {
        source: "/download/gresspay-companion.apk",
        destination: "/download/gresspay.apk",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
