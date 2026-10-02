import { describe, expect, it } from "vitest";
import { TOOLS, canonicalOf } from "../lib/tools";
import { BRAND_IDS } from "../components/brand-icons";
import { RESERVED_ROUTES } from "../lib/config";

describe("tool registry", () => {
  it("has exactly 12 tools with unique routes", () => {
    expect(TOOLS).toHaveLength(12);
    const routes = TOOLS.map((t) => t.route);
    expect(new Set(routes).size).toBe(12);
    for (const t of TOOLS) {
      expect(t.route.startsWith("/")).toBe(true);
      expect(t.seoTitle.length).toBeGreaterThan(10);
      expect(t.seoDescription.length).toBeGreaterThan(20);
    }
  });

  it("every tool has a renderable icon (brand logo or generic glyph)", () => {
    const generic = new Set(["shortlink", "universal", "video", "image", "audio"]);
    for (const t of TOOLS) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(BRAND_IDS.has(t.icon) || generic.has(t.icon)).toBe(true);
    }
  });
  it("every tool route is reserved (no short-code collision)", () => {
    for (const t of TOOLS) {
      const slug = t.route.replace(/^\//, "");
      expect(RESERVED_ROUTES.has(slug)).toBe(true);
    }
    for (const extra of ["faq", "preview", "report-abuse", "about"]) {
      expect(RESERVED_ROUTES.has(extra)).toBe(true);
    }
  });

  it("SEO titles and descriptions are unique per page", () => {
    const titles = TOOLS.map((t) => t.seoTitle);
    const descs = TOOLS.map((t) => t.seoDescription);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("canonical URLs derive from APP_URL (no hardcode)", () => {
    const c = canonicalOf("/tiktok-downloader");
    expect(c.endsWith("/tiktok-downloader")).toBe(true);
    expect(c).not.toContain("YOUR-DOMAIN");
    expect(c).not.toContain("example.com");
    expect(c.startsWith("http")).toBe(true);
  });
});
