type Bucket = { count: number; resetAt: number };

import { noteRateLimit } from "@/lib/security-shield";

const buckets = new Map<string, Bucket>();

function enabled(): boolean {
  return (process.env.RATE_LIMIT_ENABLED ?? "true") !== "false";
}

export function rateLimitMax(): number {
  const v = Number(process.env.RATE_LIMIT_MAX ?? "10");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 10;
}

export function rateLimitWindowMs(): number {
  const v = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "600000");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 600000;
}

function sweep(): void {
  const now = Date.now();
  const stale: string[] = [];
  buckets.forEach((b, k) => {
    if (now >= b.resetAt) stale.push(k);
  });
  for (const k of stale) buckets.delete(k);
  // Hard cap so the map can never grow unbounded.
  if (buckets.size > 20000) {
    const ids: string[] = [];
    buckets.forEach((_b, k) => {
      if (buckets.size - ids.length > 20000) ids.push(k);
    });
    for (const id of ids) buckets.delete(id);
  }
}

export function checkRateLimit(
  key: string,
  opts: { max?: number; windowMs?: number } = {}
): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  if (!enabled()) return { allowed: true, remaining: 999, retryAfterMs: 0 };
  const now = Date.now();
  const max = opts.max ?? rateLimitMax();
  const win = opts.windowMs ?? rateLimitWindowMs();
  sweep();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + win });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (b.count < max) {
    b.count += 1;
    return { allowed: true, remaining: max - b.count, retryAfterMs: 0 };
  }
  noteRateLimit(key);
  return { allowed: false, remaining: 0, retryAfterMs: b.resetAt - now };
}

export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64);
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim().slice(0, 64);
  return "unknown";
}

/**
 * Rate-limit identity.
 * - `cf-connecting-ip` / `x-real-ip` win when TRUST_PROXY=true.
 * - Otherwise the entry `TRUSTED_PROXY_HOPS` positions from the RIGHT of
 *   x-forwarded-for is used (default 1 = the standard single-proxy setup).
 *   The leftmost entry is NEVER trusted blindly (spoofable).
 * - Without TRUST_PROXY everyone shares the conservative "direct" bucket.
 */
export function clientKeyFromHeaders(h: Headers): string {
  const trusted = (process.env.TRUST_PROXY ?? "false") === "true";
  if (trusted) {
    const cf = h.get("cf-connecting-ip")?.trim();
    if (cf) return cf.slice(0, 64);
    const xri = h.get("x-real-ip")?.trim();
    if (xri) return xri.slice(0, 64);
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
      const hopsRaw = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
      const hops = Number.isFinite(hopsRaw) && hopsRaw > 0 ? Math.floor(hopsRaw) : 1;
      const idx = Math.max(0, parts.length - 1 - hops);
      if (parts[idx]) return parts[idx].slice(0, 64);
    }
  }
  return "direct";
}

/** For tests only */
export function __resetRateLimits() {
  buckets.clear();
}
