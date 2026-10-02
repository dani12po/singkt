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

/** Root sitemap: single-language legacy pages (Indonesian). */
export function rootSitemapXml(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...ROOT_STATIC_ROUTES.map((r) => urlEntry(`${SITE_URL}${r}`, today)),
    ...LANDING_PAGES.map((p) => urlEntry(`${SITE_URL}${p.route}`, today)),
  ];
  return wrap(urls);
}

export function blogSlugsFor(locale: string): string[] {
  return (locale === "id" ? BLOG_POSTS : BLOG_POSTS_EN).map((b) => b.slug);
}

/** Per-locale sitemap: every localized page + its blog posts. */
export function localeSitemapXml(locale: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    urlEntry(`${SITE_URL}/${locale}`, today),
    ...TOOLS.map((t) => urlEntry(`${SITE_URL}/${locale}${t.route}`, today)),
    urlEntry(`${SITE_URL}/${locale}/faq`, today),
    urlEntry(`${SITE_URL}/${locale}/report-abuse`, today),
    urlEntry(`${SITE_URL}/${locale}/search`, today),
    urlEntry(`${SITE_URL}/${locale}/blog`, today),
    ...blogSlugsFor(locale).map((s) => urlEntry(`${SITE_URL}/${locale}/blog/${s}`, today)),
  ];
  return wrap(urls);
}

/** Sitemap index: root + one file per locale. */
export function sitemapIndexXml(): string {
  const files = ["sitemap-root.xml", ...LOCALE_CODES.map((c) => `sitemap-${c}.xml`)];
  const items = files
    .map((f) => `  <sitemap><loc>${SITE_URL}/${f}</loc></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
