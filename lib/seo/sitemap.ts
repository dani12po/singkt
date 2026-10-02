import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo/seo";
import { TOOLS } from "@/lib/tools";
import { LANDING_PAGES } from "@/lib/seo/landing";
import { BLOG_POSTS } from "@/lib/blog";
import { BLOG_POSTS_EN } from "@/lib/blog-en";
import { LOCALE_CODES } from "@/lib/i18n/locales";

export const ROOT_STATIC_ROUTES = ["/about", "/privacy", "/terms"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function urlEntry(loc: string, lastmod?: string): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${esc(loc)}</loc>${lm}</url>`;
}

function wrap(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

/**
 * Base URL for sitemap <loc> entries.
 * Prefers the incoming request's public host (so crawlers never see
 * localhost even when APP_URL is unset on the server), falls back to
 * SITE_URL (env APP_URL) in build/test contexts without a request.
 */
export function siteBase(): string {
  try {
    const h = headers();
    const host = ((h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0] ?? "")
      .trim()
      .toLowerCase();
    const isLocal =
      !host ||
      host.startsWith("localhost") ||
      host.startsWith("127.") ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".test") ||
      host.endsWith(".example") ||
      host.endsWith(".invalid");
    if (!isLocal) {
      const rawProto = ((h.get("x-forwarded-proto") ?? "").split(",")[0] ?? "")
        .trim()
        .toLowerCase();
      const scheme =
        rawProto === "http" || rawProto === "https"
          ? rawProto
          : SITE_URL.startsWith("http://")
            ? "http"
            : "https";
      return `${scheme}://${host}`;
    }
  } catch {
    // No request scope (build, unit test) → fall through to SITE_URL.
  }
  return SITE_URL;
}

/** Root sitemap: single-language legacy pages (Indonesian). */
export function rootSitemapXml(base: string = siteBase()): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    urlEntry(`${base}/`, today),
    ...ROOT_STATIC_ROUTES.map((r) => urlEntry(`${base}${r}`, today)),
    ...LANDING_PAGES.map((p) => urlEntry(`${base}${p.route}`, today)),
  ];
  return wrap(urls);
}

export function blogSlugsFor(locale: string): string[] {
  return (locale === "id" ? BLOG_POSTS : BLOG_POSTS_EN).map((b) => b.slug);
}

/** Per-locale sitemap: every localized page + its blog posts. */
export function localeSitemapXml(locale: string, base: string = siteBase()): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    urlEntry(`${base}/${locale}`, today),
    ...TOOLS.map((t) => urlEntry(`${base}/${locale}${t.route}`, today)),
    urlEntry(`${base}/${locale}/faq`, today),
    urlEntry(`${base}/${locale}/report-abuse`, today),
    urlEntry(`${base}/${locale}/search`, today),
    urlEntry(`${base}/${locale}/sitemap`, today),
    urlEntry(`${base}/${locale}/blog`, today),
    ...blogSlugsFor(locale).map((s) => urlEntry(`${base}/${locale}/blog/${s}`, today)),
  ];
  return wrap(urls);
}

/** Sitemap index: root + one file per locale. */
export function sitemapIndexXml(base: string = siteBase()): string {
  const files = ["sitemap-root.xml", ...LOCALE_CODES.map((c) => `sitemap-${c}.xml`)];
  const items = files
    .map((f) => `  <sitemap><loc>${base}/${f}</loc></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
