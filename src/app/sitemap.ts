import type { MetadataRoute } from "next";
import { site } from "@/content/marketing";

const paths = [
  "/",
  "/services",
  "/fees",
  "/developers",
  "/download",
  "/help",
  "/status",
  "/legal/terms",
  "/legal/privacy",
  "/legal/security",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
