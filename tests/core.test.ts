import { beforeEach, describe, expect, it, afterEach } from "vitest";
import { __resetRateLimits, checkRateLimit, clientKeyFromHeaders } from "../lib/rate-limit";
import { verifyAdminToken } from "../lib/admin-auth";
import { expiryToDate, parseUserAgent } from "../lib/utils";
import { RESERVED_ROUTES } from "../lib/config";

describe("rate-limit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows 10 then blocks (10 links / 10 min / IP)", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("ip:1.2.3.4").allowed).toBe(true);
    }
    const r = checkRateLimit("ip:1.2.3.4");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates buckets per key (no cross-IP bypass confusion)", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("ip:A");
    expect(checkRateLimit("ip:B").allowed).toBe(true);
  });

  it("supports separate budgets per feature", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("dl:u1", { max: 3, windowMs: 60000 }).allowed).toBe(true);
    }
    expect(checkRateLimit("dl:u1", { max: 3, windowMs: 60000 }).allowed).toBe(false);
    // Different bucket name = independent budget:
    expect(checkRateLimit("thumb:u1", { max: 3, windowMs: 60000 }).allowed).toBe(true);
  });

  it("expires buckets after the window (no unbounded growth)", async () => {
    expect(checkRateLimit("tmp:1", { max: 1, windowMs: 30 }).allowed).toBe(true);
    expect(checkRateLimit("tmp:1", { max: 1, windowMs: 30 }).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 40));
    expect(checkRateLimit("tmp:1", { max: 1, windowMs: 30 }).allowed).toBe(true);
  });
});

describe("client identity", () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env.TRUST_PROXY = OLD.TRUST_PROXY;
    process.env.TRUSTED_PROXY_HOPS = OLD.TRUSTED_PROXY_HOPS;
  });

  const H = (h: Record<string, string>) => new Headers(h);

  it("ignores spoofed XFF unless TRUST_PROXY", () => {
    delete process.env.TRUST_PROXY;
    expect(clientKeyFromHeaders(H({ "x-forwarded-for": "1.2.3.4" }))).toBe("direct");
  });

  it("takes the correct entry from the right with hops", () => {
    process.env.TRUST_PROXY = "true";
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(
      clientKeyFromHeaders(H({ "x-forwarded-for": "client, p1, p2" }))
    ).toBe("client");
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(
      clientKeyFromHeaders(H({ "x-forwarded-for": "client, p1, p2" }))
    ).toBe("p1");
  });

  it("prioritizes cf-connecting-ip", () => {
    process.env.TRUST_PROXY = "true";
    expect(
      clientKeyFromHeaders(H({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))
    ).toBe("9.9.9.9");
  });
});

describe("admin-auth", () => {
  it("rejects wrong tokens, accepts timing-safe match", () => {
    process.env.ADMIN_TOKEN = "test-token-12345678";
    expect(verifyAdminToken("wrong")).toBe(false);
    expect(verifyAdminToken("test-token-12345678")).toBe(true);
    expect(verifyAdminToken("")).toBe(false);
  });
});

describe("utils", () => {
  it("maps expiry options to dates", () => {
    expect(expiryToDate("none")).toBeNull();
    expect(expiryToDate(undefined)).toBeNull();
    const d = expiryToDate("7d");
    expect(d!.getTime()).toBeGreaterThan(Date.now());
  });

  it("parses UA without storing IP", () => {
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1").device).toBe("mobile");
    expect(parseUserAgent("Mozilla/5.0 Windows NT 10.0 Win64; x64 Chrome/120 Safari/537.36").browser).toBe("chrome");
  });

  it("reserves sensitive routes for alias", () => {
    for (const r of ["admin", "api", "login", "preview", "report-abuse"]) {
      expect(RESERVED_ROUTES.has(r)).toBe(true);
    }
  });
});
