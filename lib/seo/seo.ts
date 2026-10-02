import { APP_NAME, APP_URL } from "@/lib/config";

export const SITE_NAME = APP_NAME;
export const SITE_URL = APP_URL.replace(/\/+$/, "");
export const SITE_LOCALE = "id_ID";
export const SITE_LANG = "id";
export const SITE_TWITTER_HANDLE = process.env.SITE_TWITTER_HANDLE || "";

export function canonical(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p === "/" ? "" : p}`;
}

/** Search Console / webmaster verification tokens (env-gated, never hardcoded). */
export function verification() {
  const out: { google?: string; other: Record<string, string | string[]> } = { other: {} };
  if (process.env.GOOGLE_SITE_VERIFICATION) out.google = process.env.GOOGLE_SITE_VERIFICATION;
  if (process.env.BING_SITE_VERIFICATION) {
    out.other["msvalidate.01"] = process.env.BING_SITE_VERIFICATION;
  }
  if (process.env.YANDEX_SITE_VERIFICATION) {
    out.other.yandex = process.env.YANDEX_SITE_VERIFICATION;
  }
  return out;
}

/** GA Measurement ID (env-gated). Empty = analytics disabled. */
export function gaId(): string {
  return process.env.NEXT_PUBLIC_GA_ID ?? "";
}
