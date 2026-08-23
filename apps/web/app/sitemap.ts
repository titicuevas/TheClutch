import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

const INDEXED_PATHS = ["", "/faq", "/casos", "/feedback", "/agradecimientos", "/privacidad"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return INDEXED_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.6 : 1,
  }));
}
