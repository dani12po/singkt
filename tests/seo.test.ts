import { describe, expect, it } from "vitest";
import { buildMetadata } from "../lib/seo/metadata";
import { canonical, SITE_URL } from "../lib/seo/seo";
import {
  article,
  breadcrumb,
  collectionPage,
  faqPage,
  howTo,
  organization,
  softwareApp,
  webPage,
  website,
} from "../lib/seo/structured-data";
import { localeSitemapXml, rootSitemapXml, sitemapIndexXml } from "../lib/seo/sitemap";
import { robotsRules } from "../lib/seo/robots";
import { TOOLS } from "../lib/tools";
import { LANDING_PAGES } from "../lib/seo/landing";
import { BLOG_POSTS } from "../lib/blog";
import { searchSite } from "../lib/search";
import { shareLinks, SOCIAL_TAGS } from "../lib/social";
import robots from "../app/robots";

describe("metadata engine", () => {
  it("emits complete tags: title, desc, keywords, robots, canonical, OG, twitter, hreflang", async () => {
    const m = buildMetadata({
      title: "TikTok Video Downloader — SINGKAT",
      description: "Download video TikTok.",
      path: "/tiktok-downloader",
      locale: "en",
    });
    expect(m.title).toContain("TikTok");
    expect(m.description).toBeTruthy();
    expect((m.keywords as string[]).length).toBeGreaterThan(0);
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/en/tiktok-downloader`);
    const langs = m.alternates?.languages as Record<string, string>;
    expect(langs["x-default"]).toBeTruthy();
    const og = m.openGraph as unknown as {
      type?: string;
      url?: string;
      images?: { url: string }[];
    };
    expect(og?.type).toBe("website");
    expect(og?.url).toContain("/tiktok-downloader");
    expect(og?.images?.[0]?.url).toContain("/og-image?t=");
    const tw = m.twitter as unknown as { card?: string };
    expect(tw?.card).toBe("summary_large_image");
  });

  it("supports noindex pages", () => {
    const m = buildMetadata({ title: "x", description: "y", path: "/admin", noindex: true });
    expect(m.robots).toMatchObject({ index: false });
  });
});

describe("structured data", () => {
  it("builds valid schema.org graphs", () => {
    const docs = [
      organization(),
      website(),
      softwareApp({ name: "X", path: "/x", description: "d" }),
      webPage({ name: "X", path: "/x", description: "d" }),
      collectionPage({ name: "X", path: "/x", description: "d" }),
      breadcrumb([{ name: "Home", path: "/" }, { name: "X" }]),
      faqPage("/x", [{ q: "Q?", a: "A." }]),
      howTo({ name: "H", path: "/x", description: "d", steps: [{ t: "S", d: "D" }] }),
      article({ title: "T", path: "/blog/a", description: "d", datePublished: "2026-01-01", tags: ["a"] }),
    ];
    for (const d of docs) {
      expect((d as { "@context"?: string })["@context"]).toBe("https://schema.org");
      // Must serialize cleanly into <script type="application/ld+json">
      expect(() => JSON.stringify(d)).not.toThrow();
    }
    const faq = faqPage("/x", [{ q: "Q?", a: "A." }]) as {
      mainEntity: { "@type": string }[];
    };
    expect(faq.mainEntity[0]["@type"]).toBe("Question");
  });

  it("website schema advertises internal search", () => {
    const w = website() as {
      potentialAction: { target: { urlTemplate: string } };
    };
    expect(w.potentialAction.target.urlTemplate).toContain("/search?q=");
  });
});

describe("page inventory uniqueness", () => {
  it("titles and descriptions are unique across tools, landing and blog", () => {
    const titles = [
      ...TOOLS.map((t) => t.seoTitle),
      ...LANDING_PAGES.map((p) => p.seoTitle),
      ...BLOG_POSTS.map((b) => `${b.title} — SINGKAT Blog`),
    ];
    expect(new Set(titles).size).toBe(titles.length);
    const descs = [
      ...TOOLS.map((t) => t.seoDescription),
      ...LANDING_PAGES.map((p) => p.seoDescription),
      ...BLOG_POSTS.map((b) => b.description),
    ];
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("landing pages have unique H1, FAQ and canonical targets", () => {
    const h1s = LANDING_PAGES.map((p) => p.h1);
    expect(new Set(h1s).size).toBe(h1s.length);
    for (const p of LANDING_PAGES) {
      expect(p.faqs.length).toBeGreaterThanOrEqual(3);
      expect(p.intro.length).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThan(0);
    }
    const routes = LANDING_PAGES.map((p) => p.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("blog posts are complete with internal links", () => {
    const slugs = new Set(BLOG_POSTS.map((b) => b.slug));
    expect(slugs.size).toBe(BLOG_POSTS.length);
    for (const b of BLOG_POSTS) {
      expect(b.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(b.faqs.length).toBeGreaterThanOrEqual(2);
      expect(b.steps.length).toBeGreaterThanOrEqual(3);
      for (const r of b.related) expect(slugs.has(r)).toBe(true);
    }
  });
});

describe("sitemap + robots", () => {
  it("locale sitemaps cover localized pages and posts", () => {
    const id = localeSitemapXml("id");
    for (const u of ["/id", "/id/tiktok-downloader", "/id/faq", "/id/blog", "/id/blog/cara-download-video-facebook"]) {
      expect(id).toContain(u);
    }
    const en = localeSitemapXml("en");
    expect(en).toContain("/en/tiktok-downloader");
    expect(rootSitemapXml()).toContain("/facebook-video-downloader");
    expect(rootSitemapXml()).toContain("/about");
  });

  it("sitemap index lists root + every locale file", () => {
    const idx = sitemapIndexXml();
    expect(idx).toContain("sitemap-root.xml");
    for (const code of ["en", "id", "ar", "zh-cn"]) {
      expect(idx).toContain(`sitemap-${code}.xml`);
    }
  });

  it("robots allows public content and blocks admin/api", () => {
    const r = robotsRules();
    const rule = r.rules as unknown as { disallow: string | string[] }[];
    const flat = rule.flatMap((x) => (Array.isArray(x.disallow) ? x.disallow : [x.disallow]));
    for (const d of ["/admin", "/api/", "/_next/"]) expect(flat).toContain(d);
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe("search + social", () => {
  it("finds tools and articles by keyword", () => {
    expect(searchSite("tiktok").length).toBeGreaterThan(0);
    expect(searchSite("facebook reel").some((r) => r.kind === "article")).toBe(true);
    expect(searchSite("x")).toHaveLength(0); // too short
    expect(searchSite("zzz-tidak-ada").length).toBe(0);
  });

  it("builds share links with tags", () => {
    const links = shareLinks("Judul", "https://x.example/a");
    expect(links.facebook).toContain("facebook.com/sharer");
    expect(links.whatsapp).toContain("wa.me");
    expect(SOCIAL_TAGS.length).toBeGreaterThan(0);
  });
});
