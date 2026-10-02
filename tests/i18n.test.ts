import { describe, expect, it } from "vitest";
import {
  cookieLocale,
  detectLocale,
  isLocale,
  localeDir,
  localeFromAcceptLanguage,
  localeFromCountry,
  LOCALES,
  normalizeLocale,
} from "../lib/i18n/locales";
import { getDict, getToolFaqs } from "../lib/i18n/get";
import type { Dict } from "../lib/i18n/dict";
import { buildMetadata } from "../lib/seo/metadata";
import { localeSitemapXml, rootSitemapXml, sitemapIndexXml } from "../lib/seo/sitemap";

describe("locale detection (priority: cookie > browser > country > en)", () => {
  it("parses Accept-Language with q-values", () => {
    expect(localeFromAcceptLanguage("ja-JP,ja;q=0.9,en;q=0.8")).toBe("ja");
    expect(localeFromAcceptLanguage("ms-MY,ms;q=0.9")).toBe("ms");
    expect(localeFromAcceptLanguage("zh-Hant-TW,zh;q=0.9")).toBe("zh-tw");
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt");
    expect(localeFromAcceptLanguage("xx-YY")).toBeNull();
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });

  it("maps countries to locales", () => {
    expect(localeFromCountry("ID")).toBe("id");
    expect(localeFromCountry("JP")).toBe("ja");
    expect(localeFromCountry("SA")).toBe("ar");
    expect(localeFromCountry("XX")).toBeNull();
  });

  it("reads the manual cookie first, falls back to English", () => {
    expect(cookieLocale("singkat_locale=ja")).toBe("ja");
    expect(cookieLocale("other=1")).toBeNull();
    expect(
      detectLocale({ cookie: "singkat_locale=fr", acceptLanguage: "ja", country: "ID" })
    ).toBe("fr");
    expect(detectLocale({ acceptLanguage: "de-DE,de;q=0.9" })).toBe("de");
    expect(detectLocale({ country: "BR" })).toBe("pt");
    expect(detectLocale({})).toBe("en");
  });

  it("knows all 15 locales with RTL only for Arabic", () => {
    expect(LOCALES).toHaveLength(15);
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("xx")).toBe(false);
    expect(localeDir("ar")).toBe("rtl");
    expect(localeDir("en")).toBe("ltr");
    expect(normalizeLocale("XX")).toBe("en");
  });
});

function keysOf(o: unknown, prefix = ""): string[] {
  if (typeof o !== "object" || o === null) return [prefix];
  if (Array.isArray(o)) {
    const out: string[] = [];
    for (let i = 0; i < o.length; i++) out.push(...keysOf(o[i], `${prefix}[${i}]`));
    return out;
  }
  const out: string[] = [];
  for (const k of Object.keys(o)) out.push(...keysOf((o as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
  return out;
}

function shapeOf(d: Dict): Set<string> {
  // Compare structure only (ignore array lengths: tools/why/steps vary by design? no — same shape).
  const s = new Set<string>();
  const walk = (o: unknown, path: string) => {
    if (typeof o !== "object" || o === null || typeof o === "string" || typeof o === "number" || typeof o === "boolean") {
      s.add(`${path}:${typeof o}`);
      return;
    }
    if (Array.isArray(o)) {
      s.add(`${path}:array[${o.length}]`);
      o.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    s.add(`${path}:object`);
    for (const k of Object.keys(o)) walk((o as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
  };
  walk(d, "");
  return s;
}

describe("dictionary completeness", () => {
  it("every locale has the same top-level sections as English", () => {
    const ref = getDict("en");
    const refKeys = new Set(keysOf(ref).map((k) => k.replace(/\[\d+\]/g, "[]").replace(/:.*$/, "")));
    LOCALES.forEach((l) => {
      const d = getDict(l.code);
      const keys = new Set(keysOf(d).map((k) => k.replace(/\[\d+\]/g, "[]").replace(/:.*$/, "")));
      const missing: string[] = [];
      refKeys.forEach((k) => {
        if (!keys.has(k)) missing.push(k);
      });
      expect(missing, `locale ${l.code}`).toEqual([]);
    });
  });

  it("tool FAQs resolve with shared fallback", () => {
    expect(getToolFaqs("tiktok", "id").length).toBeGreaterThan(0);
    expect(getToolFaqs("tiktok", "ja").length).toBeGreaterThan(0);
    expect(shapeOf(getDict("ar")).size).toBeGreaterThan(100);
  });
});

describe("multilingual metadata", () => {
  it("emits 15 hreflang + x-default with locale canonical", () => {
    const m = buildMetadata({
      title: "X",
      description: "Y",
      path: "/tiktok-downloader",
      locale: "ja",
    });
    const langs = m.alternates?.languages as Record<string, string>;
    expect(Object.keys(langs)).toHaveLength(16);
    expect(langs["ja"]).toContain("/ja/tiktok-downloader");
    expect(langs["zh-CN"]).toContain("/zh-cn/tiktok-downloader");
    expect(langs["x-default"]).toContain("/en/tiktok-downloader");
    expect(m.alternates?.canonical).toContain("/ja/tiktok-downloader");
  });
});

describe("multilingual sitemaps", () => {
  it("index lists root + 15 locale files", () => {
    const xml = sitemapIndexXml();
    expect(xml).toContain("sitemap-root.xml");
    for (const l of LOCALES) expect(xml).toContain(`sitemap-${l.code}.xml`);
  });

  it("locale sitemap covers localized pages and posts", () => {
    const xml = localeSitemapXml("id");
    for (const u of ["/id", "/id/tiktok-downloader", "/id/faq", "/id/blog", "/id/blog/cara-download-video-facebook"]) {
      expect(xml).toContain(u);
    }
    expect(rootSitemapXml()).toContain("/facebook-video-downloader");
  });
});
