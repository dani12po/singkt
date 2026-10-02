import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectLocale, isLocale } from "@/lib/i18n/locales";
import { TOOLS } from "@/lib/tools";

/** First-segments that live at root (never locale-prefixed). */
const ROOT_KEPT = new Set([
  "api",
  "admin",
  "_next",
  "about",
  "privacy",
  "terms",
  "preview",
  "stats",
  "expired",
  "disabled",
  "og-image",
  "rss",
  "favicon.ico",
  "robots.txt",
  "facebook-video-downloader",
  "facebook-reel-downloader",
  "facebook-hd-video-downloader",
  "youtube-video-downloader",
  "youtube-shorts-downloader",
  "youtube-mp3-downloader",
  "instagram-reel-downloader",
  "instagram-video-downloader",
  "tiktok-video-downloader",
  "twitter-video-downloader",
  "x-video-downloader",
]);

/** Legacy single-segment routes (moved under [locale]) → /en/… 301. */
const LEGACY = new Set([
  ...TOOLS.map((t) => t.route.replace(/^\//, "")),
  "faq",
  "report-abuse",
  "search",
  "sitemap",
  "blog",
]);

function detectedLocale(req: NextRequest): string {
  return detectLocale({
    cookie: req.headers.get("cookie"),
    acceptLanguage: req.headers.get("accept-language"),
    country:
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cloudfront-viewer-country"),
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never touch APIs, assets, SEO files, feeds, or admin.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/admin") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/ads.txt" ||
    pathname === "/rss" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap-") ||
    pathname.startsWith("/og-image")
  ) {
    return NextResponse.next();
  }

  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0]?.toLowerCase();

  // Already localized.
  if (first && isLocale(first)) {
    return NextResponse.next();
  }

  // Root → best locale home.
  if (parts.length === 0) {
    return NextResponse.redirect(new URL(`/${detectedLocale(req)}`, req.url));
  }

  // Root-kept pages (legal, landing, preview/stats, shortlinks) pass through.
  if (first && ROOT_KEPT.has(first)) {
    return NextResponse.next();
  }

  // Legacy single-segment pages → English prefixed URL (SEO continuity).
  if (parts.length === 1 && first && LEGACY.has(first)) {
    return NextResponse.redirect(new URL(`/en/${first}`, req.url), 301);
  }

  // Multi-segment without locale → detected locale.
  if (parts.length > 1) {
    return NextResponse.redirect(new URL(`/${detectedLocale(req)}${pathname}`, req.url));
  }

  // Single unknown segment = shortlink code: rewrite internally to the
  // redirect API (keeps /:code working without a conflicting [code] segment).
  return NextResponse.rewrite(new URL(`/api/redirect?code=${encodeURIComponent(parts[0])}`, req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
