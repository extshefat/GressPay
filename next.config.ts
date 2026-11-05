import type { NextConfig } from "next";
import { createHash } from "crypto";
import { themeBootScript } from "./src/lib/theme-boot";

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

const themeBootHash =
  "'sha256-" + createHash("sha256").update(themeBootScript).digest("base64") + "'";

const appHost = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://gresspay.extxcheats.com";
    return new URL(u).hostname;
  } catch {
    return "gresspay.extxcheats.com";
  }
})();

const r2Host = (() => {
  try {
    const base = process.env.R2_PUBLIC_BASE_URL || "";
    return base ? new URL(base).hostname : "";
  } catch {
    return "";
  }
})();

const imageHosts = [
  appHost,
  "gresspay.extxcheats.com",
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  ...(r2Host ? [r2Host] : []),
].filter(Boolean);

const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${themeBootHash}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
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
