import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/play"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
