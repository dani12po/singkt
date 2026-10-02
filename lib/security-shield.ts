/**
 * Singkat Security Shield — edge-safe request scoring for OUR OWN app.
 *
 * - Scores every request (missing UA, scanner UAs, attack signatures).
 * - score >= 100  → BLOCKED (403 + SECURITY_BLOCKED JSON, IP held 10 min).
 * - score >= 50   → suspicious: logged + `x-singkat-shield: monitor` header.
 * - Otherwise transparent passthrough.
 *
 * Pure TypeScript, no Node APIs — safe to run in middleware.
 */

export const BLOCK_MESSAGE = "Your IP has been blocked by Singkat.com Security Shield";
export const BLOCK_CODE = "SECURITY_BLOCKED";

const SUSPICIOUS_UA = [
  "sqlmap",
  "nikto",
  "masscan",
  "nmap",
  "dirbuster",
  "gobuster",
  "dirsearch",
  "hydra",
  "medusa",
  "nessus",
  "openvas",
  "acunetix",
  "netsparker",
  "wpscan",
  "sqlninja",
  "metasploit",
  "commix",
  "xsser",
];

const SIGNATURES = [
  "<script",
  "%3cscript",
  "javascript:",
  "onerror=",
  "onload=",
  "onclick=",
  "../",
  "..%2f",
  "%2e%2e",
  "..\\",
  "/etc/passwd",
  "/proc/",
  "union select",
  "union%20select",
  "' or '",
  '" or "',
  "' or 1=1",
  "sleep(",
  "benchmark(",
  "xp_cmdshell",
  "@@version",
  "${",
  "{{",
  "base64_decode",
];

export interface ShieldScore {
  score: number;
  reasons: string[];
}

export function scoreRequest(input: {
  path: string;
  query?: string;
  userAgent?: string | null;
}): ShieldScore {
  const reasons: string[] = [];
  let score = 0;
  const ua = (input.userAgent ?? "").trim();
  if (!ua) {
    score += 20;
    reasons.push("missing-user-agent");
  } else {
    const low = ua.toLowerCase();
    for (const sig of SUSPICIOUS_UA) {
      if (low.includes(sig)) {
        score += 40;
        reasons.push(`scanner-ua:${sig}`);
        break;
      }
    }
  }
  const hay = `${input.path} ${input.query ?? ""}`.toLowerCase();
  if (hay.length > 2000) {
    score += 30;
    reasons.push("abnormal-length");
  }
  for (const sig of SIGNATURES) {
    if (hay.includes(sig)) {
      score += 50;
      reasons.push(`signature:${sig}`);
      if (score >= 150) break;
    }
  }
  return { score, reasons };
}

function shieldEnabled(): boolean {
  return (process.env.SECURITY_SHIELD_ENABLED ?? "true") !== "false";
}

function blockMinutes(): number {
  const v = Number(process.env.SECURITY_BLOCK_MINUTES ?? "10");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 10;
}

const blocked = new Map<string, number>();

function sweepBlocked(): void {
  const now = Date.now();
  const stale: string[] = [];
  blocked.forEach((exp, ip) => {
    if (now >= exp) stale.push(ip);
  });
  for (const ip of stale) blocked.delete(ip);
  if (blocked.size > 5000) {
    const ids: string[] = [];
    blocked.forEach((_e, ip) => {
      if (blocked.size - ids.length > 5000) ids.push(ip);
    });
    for (const id of ids) blocked.delete(id);
  }
}

export function isBlocked(ip: string): boolean {
  sweepBlocked();
  const exp = blocked.get(ip);
  if (!exp) return false;
  if (Date.now() >= exp) {
    blocked.delete(ip);
    return false;
  }
  return true;
}

export function blockIp(ip: string): void {
  sweepBlocked();
  blocked.set(ip, Date.now() + blockMinutes() * 60000);
}

/** For tests/admin only */
export function __resetShield() {
  blocked.clear();
  events.length = 0;
  counters.totalRequests = 0;
  counters.blockedRequests = 0;
  counters.suspiciousRequests = 0;
  counters.rateLimitHits = 0;
  topEndpoints.clear();
  rateHitsByPrefix.clear();
}

// ---------------------------------------------------------------------------
// Stats (in-memory; single instance).
// ---------------------------------------------------------------------------

export interface ShieldEvent {
  t: string;
  ip: string;
  path: string;
  score: number;
  action: "allow" | "monitor" | "block";
  reasons: string[];
}

const events: ShieldEvent[] = [];

export const counters = {
  totalRequests: 0,
  blockedRequests: 0,
  suspiciousRequests: 0,
  rateLimitHits: 0,
};

const topEndpoints = new Map<string, number>();
const rateHitsByPrefix = new Map<string, number>();

function noteEndpoint(path: string): void {
  const clean = path.split("?")[0].slice(0, 128) || "/";
  topEndpoints.set(clean, (topEndpoints.get(clean) ?? 0) + 1);
  if (topEndpoints.size > 200) {
    const first = topEndpoints.keys().next();
    if (!first.done) topEndpoints.delete(first.value);
  }
}

export function noteRequest(path: string): void {
  counters.totalRequests += 1;
  noteEndpoint(path);
}

/** Called from checkRateLimit on every deny. */
export function noteRateLimit(key: string): void {
  counters.rateLimitHits += 1;
  const prefix = key.split(":")[0] || "other";
  rateHitsByPrefix.set(prefix, (rateHitsByPrefix.get(prefix) ?? 0) + 1);
}

export function noteShieldEvent(e: Omit<ShieldEvent, "t">): void {
  if (e.action === "block") counters.blockedRequests += 1;
  if (e.action === "monitor") counters.suspiciousRequests += 1;
  noteEndpoint(e.path);
  events.push({ ...e, t: new Date().toISOString() });
  if (events.length > 200) events.splice(0, events.length - 200);
}

export function securitySnapshot(): {
  counters: typeof counters;
  topEndpoints: { path: string; hits: number }[];
  rateHitsByPrefix: Record<string, number>;
  recentEvents: ShieldEvent[];
} {
  const byPrefix: Record<string, number> = {};
  rateHitsByPrefix.forEach((v, k) => {
    byPrefix[k] = v;
  });
  const tops: { path: string; hits: number }[] = [];
  topEndpoints.forEach((hits, path) => {
    tops.push({ path, hits });
  });
  tops.sort((a, b) => b.hits - a.hits);
  return {
    counters: { ...counters },
    topEndpoints: tops.slice(0, 10),
    rateHitsByPrefix: byPrefix,
    recentEvents: events.slice(-50).reverse(),
  };
}

export function shieldDisabled(): boolean {
  return !shieldEnabled();
}
