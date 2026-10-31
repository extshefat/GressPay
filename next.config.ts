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

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // (dashboard) is a route group — URLs are /overview etc.
  // Keep /dashboard/* working for nav + bookmarks.
  async rewrites() {
    return [{ source: "/dashboard/:path*", destination: "/:path*" }];
  },
  async redirects() {
    return [
      {
        source: "/downloads/:path*",
        destination: "/download/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
