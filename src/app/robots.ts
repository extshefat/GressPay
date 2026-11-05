import type { MetadataRoute } from "next";
import { site } from "@/content/marketing";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/design-system", "/api/", "/checkout-preview"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
