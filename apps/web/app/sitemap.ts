import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";
export default function sitemap(): MetadataRoute.Sitemap { const base = siteUrl(); return ["", "/faq", "/casos", "/feedback", "/agradecimientos", "/privacidad"].map((path) => ({ url: `${base}${path}`, changeFrequency: path ? "monthly" : "weekly", priority: path ? 0.6 : 1 })); }
