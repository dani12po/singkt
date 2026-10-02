export interface LocaleInfo {
  code: string;
  label: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "ms", label: "Bahasa Melayu", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "zh-cn", label: "简体中文", dir: "ltr" },
  { code: "zh-tw", label: "繁體中文", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "it", label: "Italiano", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const DEFAULT_LOCALE = "en";

export function isLocale(code: string | undefined | null): boolean {
  return !!code && LOCALE_CODES.includes(code.toLowerCase());
}

export function normalizeLocale(code: string | undefined | null): string {
  const c = (code ?? "").toLowerCase();
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export function localeDir(code: string): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === code)?.dir ?? "ltr";
}

const COUNTRY_LOCALE: Record<string, string> = {
  ID: "id",
  MY: "ms",
  SG: "en",
  US: "en",
  GB: "en",
  CA: "en",
  AU: "en",
  JP: "ja",
  KR: "ko",
  CN: "zh-cn",
  TW: "zh-tw",
  HK: "zh-tw",
  DE: "de",
  FR: "fr",
  ES: "es",
  IT: "it",
  BR: "pt",
  PT: "pt",
  MX: "es",
  TR: "tr",
  SA: "ar",
  AE: "ar",
  RU: "ru",
};

export function localeFromCountry(country: string | undefined | null): string | null {
  if (!country) return null;
  return COUNTRY_LOCALE[country.toUpperCase()] ?? null;
}

/** Parse Accept-Language ("ja-JP,ja;q=0.9,en;q=0.8") → best supported locale. */
export function localeFromAcceptLanguage(header: string | undefined | null): string | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => {
    const [range, ...params] = p.trim().split(";");
    let q = 1;
    for (const pr of params) {
      const m = pr.trim().match(/^q=([0-9.]+)$/);
      if (m) q = Number(m[1]);
    }
    return { range: range.toLowerCase(), q };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { range, q } of parts) {
    if (q <= 0 || range === "*") continue;
    if (isLocale(range)) return range;
    // zh-hans → zh-cn, zh-hant → zh-tw, pt-br → pt, es-mx → es …
    const base = range.split("-")[0];
    if (base === "zh") {
      if (range.includes("hant") || range === "zh-tw" || range === "zh-hk") return "zh-tw";
      return "zh-cn";
    }
    if (isLocale(base)) return base;
  }
  return null;
}

export function cookieLocale(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)singkat_locale=([A-Za-z-]+)/);
  if (!m) return null;
  const c = m[1].toLowerCase();
  return isLocale(c) ? c : null;
}

/**
 * Priority: manual cookie → Accept-Language → country → English fallback.
 * (Country headers are only hints; cookie/browser preference wins.)
 */
export function detectLocale(opts: {
  cookie?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
}): string {
  return (
    cookieLocale(opts.cookie ?? null) ??
    localeFromAcceptLanguage(opts.acceptLanguage ?? null) ??
    localeFromCountry(opts.country ?? null) ??
    DEFAULT_LOCALE
  );
}
