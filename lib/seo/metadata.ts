import type { Metadata } from "next";
import { canonical, SITE_TWITTER_HANDLE, SITE_URL, verification } from "@/lib/seo/seo";
import { DEFAULT_LOCALE, LOCALE_CODES } from "@/lib/i18n/locales";

/** Default keywords per route (Indonesian + English). Pages may extend. */
export const KEYWORDS_BY_ROUTE: Record<string, string[]> = {
  "/": ["url shortener indonesia", "shortlink gratis", "video downloader", "tiktok downloader", "singkat"],
  "/shortlink": ["url shortener", "shortlink gratis", "pendekkan link", "pemendek url", "custom alias", "qr code link"],
  "/downloader": ["universal downloader", "download video", "download audio", "social media downloader", "allah link media"],
  "/tiktok-downloader": ["tiktok downloader", "download video tiktok", "tiktok tanpa watermark", "tiktok mp3", "save tiktok"],
  "/facebook-downloader": ["facebook downloader", "download video facebook", "fb downloader", "facebook reels download", "savefrom facebook"],
  "/instagram-downloader": ["instagram downloader", "download reel instagram", "ig downloader", "instagram video download", "saveig"],
  "/twitter-downloader": ["twitter downloader", "x downloader", "download video twitter", "twitter video download", "save tweet video"],
  "/youtube-downloader": ["youtube downloader", "download video youtube", "youtube mp3", "youtube shorts download", "yt downloader"],
  "/vimeo-downloader": ["vimeo downloader", "download video vimeo", "vimeo video download"],
  "/pinterest-downloader": ["pinterest downloader", "download video pinterest", "pinterest video download", "pin downloader"],
  "/video-downloader": ["video downloader", "download mp4", "direct video download", "webm downloader"],
  "/image-downloader": ["image downloader", "download gambar", "jpg downloader", "png download"],
  "/audio-downloader": ["audio downloader", "download mp3", "mp3 downloader", "audio direct download"],
  "/blog": ["tutorial download video", "cara download", "tips downloader"],
  "/faq": ["faq singkat", "bantuan downloader", "pertanyaan umum"],
  "/search": ["cari tool singkat"],
};

export interface PageMetaInput {
  title: string;
  description: string;
  /** Route path, e.g. "/tiktok-downloader". Used for canonical + OG URL. */
  path: string;
  keywords?: string[];
  /** Locale of this page version (default: Indonesian legacy "id"). */
  locale?: string;
  /** Explicit canonical override (e.g. x-video → twitter-video). */
  canonicalPath?: string;
  /** Set true for admin/preview/internal pages. */
  noindex?: boolean;
  /** Override OG image (absolute URL). Defaults to generated /og-image. */
  ogImage?: string;
  ogImageAlt?: string;
}

export function ogImageFor(title: string): string {
  return `${SITE_URL}/og-image?t=${encodeURIComponent(title.slice(0, 90))}`;
}

/**
 * Central metadata builder — every public page must use this so
 * title/description/canonical/OG/Twitter/keywords/robots/hreflang
 * stay complete and consistent.
 */
export function buildMetadata(input: PageMetaInput): Metadata {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const canonPath = input.canonicalPath ?? `/${locale}${input.path}`;
  const url = canonical(canonPath);
  const keywords = [...(KEYWORDS_BY_ROUTE[input.path] ?? []), ...(input.keywords ?? [])];
  const image = input.ogImage ?? ogImageFor(input.title);
  // Full hreflang matrix + x-default (→ English fallback version).
  const languages: Record<string, string> = {};
  for (const code of LOCALE_CODES) {
    const tag = code === "zh-cn" ? "zh-CN" : code === "zh-tw" ? "zh-TW" : code;
    languages[tag] = canonical(`/${code}${input.path}`);
  }
  languages["x-default"] = canonical(`/en${input.path}`);
  return {
    title: input.title,
    description: input.description,
    keywords: keywords.length > 0 ? keywords : undefined,
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" as const },
    alternates: {
      canonical: url,
      languages,
    },
    verification: verification(),
    openGraph: {
      title: input.title,
      description: input.description,
      type: "website",
      url,
      siteName: "Singkt",
      locale: "id_ID",
      images: [{ url: image, width: 1200, height: 630, alt: input.ogImageAlt ?? input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
      ...(SITE_TWITTER_HANDLE ? { creator: SITE_TWITTER_HANDLE } : {}),
    },
  };
}
