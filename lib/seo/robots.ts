import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/seo";

/** Allow landing/blog/faq/how-to pages; block admin, APIs, debug, logs. */
export function robotsRules(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/faq"],
        disallow: ["/admin", "/api/", "/preview/", "/stats/", "/_next/", "/debug", "/logs"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
