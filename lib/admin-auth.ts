import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "singkat_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function adminTokenConfigured(): boolean {
  const t = process.env.ADMIN_TOKEN;
  return !!t && t.length >= 8 && t !== "change-me-to-a-long-random-token";
}

export function verifyAdminToken(candidate: string): boolean {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected || expected.length < 8) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Stateless HMAC sessions: b64({iat, exp}).sig — the cookie proves
 * freshness without ever containing the raw ADMIN_TOKEN.
 * Trade-off: logout only clears the client cookie (no server revocation
 * list); sessions expire by themselves after 12h max.
 */
export function createAdminSession(): string {
  const body = Buffer.from(
    JSON.stringify({ iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", sessionKey()).update(body).digest("hex");
  return `${body}.${sig}`;
}

function sessionKey(): string {
  // Login already guarantees a configured token; fall back safely anyway.
  return process.env.ADMIN_TOKEN ?? "singkat-admin-unset";
}

export function destroyAdminSession(_id: string): void {
  // Stateless sessions: nothing to revoke server-side (cookie is cleared
  // by the logout route). Kept for API compatibility.
}

function sessionFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)singkat_admin=([^;]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

export function isAdminRequest(cookieHeader: string | null): boolean {
  const token = sessionFromCookie(cookieHeader);
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  const mac = createHmac("sha256", sessionKey()).update(body).digest();
  if (given.length !== mac.length) return false;
  try {
    if (!timingSafeEqual(given, mac)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      iat?: number;
      exp?: number;
    };
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") return false;
    const now = Date.now();
    if (payload.exp <= now || payload.iat > now + 60000) return false;
    if (payload.exp - payload.iat > SESSION_TTL_MS + 60000) return false;
    return true;
  } catch {
    return false;
  }
}
