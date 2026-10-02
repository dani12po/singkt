import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_ROUTES } from "../lib/config";
import { createAdminSession, isAdminRequest } from "../lib/admin-auth";
import { domainMatchesBlocked } from "../lib/shortlink-service";

const APP_DIR = join(__dirname, "..", "app");

describe("route manifest vs reserved aliases", () => {
  it("every page route is reserved (short codes can never shadow pages)", () => {
    const collect = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        let isDir = false;
        try {
          isDir = statSync(full).isDirectory();
        } catch {
          continue;
        }
        // Skip dynamic segments, dotted files (dots can't be aliases), api, admin.
        if (e.startsWith("[") || e.startsWith(".") || e.includes(".")) continue;
        if (!isDir) continue;
        if (e === "api" || e === "admin") continue;
        out.push(e);
        // One level of nesting (blog/[slug], preview/[code] are covered by parent).
      }
      return out;
    };
    const roots = collect(APP_DIR).filter((e) => !e.startsWith("(") && e !== "[locale]" && e !== "[code]");
    const localized = collect(join(APP_DIR, "[locale]"));
    const legacy = collect(join(APP_DIR, "(root)"));
    const routes = [...roots, ...localized, ...legacy];
    expect(routes.length).toBeGreaterThan(20);
    const missing = routes.filter((r) => !RESERVED_ROUTES.has(r));
    expect(missing).toEqual([]);
  });
});

describe("admin hmac sessions", () => {
  const OLD = process.env.ADMIN_TOKEN;
  it("issues verifiable sessions without the raw token", () => {
    process.env.ADMIN_TOKEN = "test-admin-token-12345";
    const s = createAdminSession();
    expect(s).not.toContain("test-admin-token-12345");
    expect(isAdminRequest(`singkat_admin=${encodeURIComponent(s)}`)).toBe(true);
    expect(isAdminRequest("singkat_admin=forged.payload")).toBe(false);
    expect(isAdminRequest(null)).toBe(false);
    process.env.ADMIN_TOKEN = OLD;
  });
});

describe("blocklist parent-domain matching", () => {
  const list = ["jahat.com"];
  it("blocks exact host and all subdomains, nothing else", () => {
    expect(domainMatchesBlocked("jahat.com", list)).toBe(true);
    expect(domainMatchesBlocked("www.jahat.com", list)).toBe(true);
    expect(domainMatchesBlocked("a.b.jahat.com", list)).toBe(true);
    expect(domainMatchesBlocked("jahat.com.evil.com", list)).toBe(false);
    expect(domainMatchesBlocked("tidakjahat.com", list)).toBe(false);
    expect(domainMatchesBlocked("baik.com", list)).toBe(false);
  });
});
