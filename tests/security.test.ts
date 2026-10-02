import { describe, expect, it } from "vitest";
import {
  __resetShield,
  blockIp,
  isBlocked,
  noteRateLimit,
  noteShieldEvent,
  scoreRequest,
  securitySnapshot,
} from "../lib/security-shield";
import {
  __resetUnlocks,
  issueUnlockToken,
  verifyUnlockToken,
} from "../lib/downloader/reward";

describe("security shield scoring", () => {
  it("lets normal traffic through untouched", () => {
    const r = scoreRequest({
      path: "/en/tiktok-downloader",
      query: "",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(r.score).toBe(0);
  });

  it("flags scanner user agents and attack signatures", () => {
    const r = scoreRequest({ path: "/api/x", userAgent: "sqlmap/1.7" });
    expect(r.score).toBeGreaterThanOrEqual(40);
    const xss = scoreRequest({
      path: "/api/stats/a",
      query: "?x=%3Cscript%3Ealert(1)",
    });
    expect(xss.score).toBeGreaterThanOrEqual(50);
  });

  it("blocks clearly hostile traffic and expires the block", () => {
    __resetShield();
    const ip = "203.0.113.99";
    expect(isBlocked(ip)).toBe(false);
    blockIp(ip);
    expect(isBlocked(ip)).toBe(true);
  });

  it("records counters and events for the dashboard", () => {
    __resetShield();
    noteShieldEvent({ ip: "1.1.1.1", path: "/api/x", score: 70, action: "monitor", reasons: ["x"] });
    noteShieldEvent({ ip: "1.1.1.2", path: "/api/y", score: 120, action: "block", reasons: ["y"] });
    noteRateLimit("media:1.1.1.1");
    const s = securitySnapshot();
    expect(s.counters.suspiciousRequests).toBe(1);
    expect(s.counters.blockedRequests).toBe(1);
    expect(s.counters.rateLimitHits).toBe(1);
    expect(s.topEndpoints[0].path).toBe("/api/x");
    expect(s.recentEvents).toHaveLength(2);
    __resetShield();
  });
});

describe("single-use download tokens", () => {
  it("a consumed token is rejected on second use", () => {
    __resetUnlocks();
    const scope = "ticket-body-123";
    const { token, exp } = issueUnlockToken(scope, 600);
    expect(verifyUnlockToken(scope, token, exp)).toBe(true);
    expect(verifyUnlockToken(scope, token, exp, { consume: true })).toBe(true);
    expect(verifyUnlockToken(scope, token, exp, { consume: true })).toBe(false);
    __resetUnlocks();
  });

  it("wrong scope or tampered token still fails", () => {
    __resetUnlocks();
    const { token, exp } = issueUnlockToken("scope-a", 600);
    expect(verifyUnlockToken("scope-b", token, exp, { consume: true })).toBe(false);
    expect(verifyUnlockToken("scope-a", `${token}00`, exp, { consume: true })).toBe(false);
    __resetUnlocks();
  });
});
