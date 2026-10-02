export const APP_NAME = process.env.APP_NAME || "Singkt";

// Never hardcode domain. All public shortlinks derive from APP_URL.
function normalizeAppUrl(raw: string | undefined): string {
  const fallback = "http://localhost:3000";
  if (!raw) return fallback;
  return raw.replace(/\/+$/, "");
}

export const APP_URL = normalizeAppUrl(process.env.APP_URL);

export function shortUrlOf(code: string): string {
  return `${APP_URL}/${code}`;
}

export const RESERVED_ROUTES = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "settings",
  "privacy",
  "terms",
  "about",
  "report-abuse",
  "preview",
  "stats",
  "faq",
  "blog",
  "search",
  "rss",
  "og-image",
  "downloader",
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
  "disabled",
  "expired",
  "_next",
  "sitemap.xml",
  "ads.txt",
  "manifest.json",
  "shortlink",
  "tiktok-downloader",
  "facebook-downloader",
  "instagram-downloader",
  "twitter-downloader",
  "youtube-downloader",
  "vimeo-downloader",
  "pinterest-downloader",
  "video-downloader",
  "image-downloader",
  "audio-downloader",
  "s",
  "qr",
  "favicon.ico",
  "robots.txt",
]);
