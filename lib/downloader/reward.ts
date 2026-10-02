import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Signed download tickets + server-side rewarded-ad sessions.
 *
 * - Variant URLs NEVER carry raw upstream URLs. They carry a ticket:
 *   base64url(JSON payload).hex(HMAC-SHA256(payload)).
 *   The server is the only party that can mint them, which kills the
 *   open-proxy problem and the `&premium=1`-stripping bypass.
 * - Premium tickets additionally need an unlock token from
 *   POST /api/reward/complete, issued only after a server-measured
 *   ad session of REWARD_AD_SECONDS completes.
 */

function secret(): string {
  return (
    process.env.REWARD_SECRET ||
    process.env.ADMIN_TOKEN ||
    "singkat-dev-reward-secret"
  );
}

let warnedDefaultSecret = false;
function secretChecked(): string {
  const s = secret();
  const isDefault =
    s === "singkat-dev-reward-secret" ||
    s === "change-me-to-a-long-random-token" ||
    s === "dev-admin-token-change-in-production" ||
    s === "dev-reward-secret-change-in-production";
  if (isDefault && process.env.NODE_ENV === "production") {
    throw new Error(
      "[singkat:reward] REWARD_SECRET (or a non-default ADMIN_TOKEN) is required in production."
    );
  }
  if (isDefault && !warnedDefaultSecret) {
    warnedDefaultSecret = true;
    console.warn(
      "[singkat:reward] WARNING: using built-in dev secret. Set REWARD_SECRET in production."
    );
  }
  return s;
}

export const REWARD_TTL_SEC = 600; // unlock token validity: 10 minutes
export const TICKET_TTL_SEC = 3600; // ticket validity: 1 hour

export function adSeconds(): number {
  const v = Number(process.env.REWARD_AD_SECONDS ?? "30");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 30;
}

/** Free: SD video + low-bitrate audio. Everything else is premium. */
export function isPremiumVideo(height: number | null | undefined): boolean {
  return (height ?? 0) >= 720;
}

export function isPremiumAudio(abr: number | null | undefined): boolean {
  return (abr ?? 0) > 128;
}

export interface TicketPayload {
  /** proxy: upstream media URL */
  u?: string;
  /** mux: upstream video/audio URLs */
  v?: string;
  a?: string;
  kind: "video" | "audio" | "image" | "thumbnail";
  fn: string;
  premium: boolean;
  /** Mux output container (mp4|webm|mkv). Defaults to mp4. */
  cont?: string;
  /** HLS manifest input (alternative to v+a). */
  hls?: string;
  /** Per-platform Referer sent to the upstream CDN. */
  ref?: string;
  exp: number;
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function b64urlDecode(s: string): string | null {
  try {
    return Buffer.from(s, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(data: string): string {
  return createHmac("sha256", secretChecked()).update(data).digest("hex");
}

/** Mint a ticket for a server-resolved variant. */
export function createTicket(
  p: Omit<TicketPayload, "exp">,
  ttlSec = TICKET_TTL_SEC
): { ticket: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = b64urlEncode(JSON.stringify({ ...p, exp }));
  return { ticket: `${body}.${sign(body)}`, exp };
}

/** Verify a ticket. Returns the payload or null. */
export function verifyTicket(ticket: string): TicketPayload | null {
  if (!ticket || ticket.length > 8192) return null;
  const dot = ticket.lastIndexOf(".");
  if (dot < 0) return null;
  const body = ticket.slice(0, dot);
  const sig = ticket.slice(dot + 1);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return null;
  }
  const mac = createHmac("sha256", secretChecked()).update(body).digest();
  if (given.length !== mac.length) return null;
  try {
    if (!timingSafeEqual(given, mac)) return null;
  } catch {
    return null;
  }
  const raw = b64urlDecode(body);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as TicketPayload;
    if (!p || typeof p.exp !== "number" || typeof p.premium !== "boolean") return null;
    if (!["video", "audio", "image", "thumbnail"].includes(p.kind)) return null;
    if (p.exp * 1000 <= Date.now()) return null;
    if (typeof p.fn !== "string" || p.fn.length > 128) return null;
    if (p.ref !== undefined && (typeof p.ref !== "string" || p.ref.length > 512)) return null;
    if (p.hls !== undefined && (typeof p.hls !== "string" || p.hls.length > 4096)) return null;
    if (p.cont !== undefined && !["mp4", "webm", "mkv"].includes(p.cont)) return null;
    return p;
  } catch {
    return null;
  }
}

export function proxyTicketUrl(u: string, kind: TicketPayload["kind"], fn: string, premium: boolean, ref?: string): string {
  const { ticket } = createTicket({ u, kind, fn, premium, ref });
  return `/api/media/dl?t=${ticket}`;
}

export function muxTicketUrl(v: string, a: string, fn: string, premium: boolean, q: string, cont = "mp4", ref?: string): string {
  const { ticket } = createTicket({ v, a, kind: "video", fn, premium, cont, ref });
  return `/api/media/mux?t=${ticket}&q=${encodeURIComponent(q)}`;
}

// ---------------------------------------------------------------------------
// Unlock tokens (rewarded ads). Bound to the ticket body, not to raw URLs.
// ---------------------------------------------------------------------------

export function issueUnlockToken(ticketBody: string, ttlSec = REWARD_TTL_SEC): {
  token: string;
  exp: number;
} {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return { token: sign(`${ticketBody}\n${exp}`), exp };
}

export function verifyUnlockToken(
  ticketBody: string,
  token: string,
  exp: number,
  opts: { consume?: boolean } = {}
): boolean {
  if (!token || !Number.isFinite(exp)) return false;
  if (exp * 1000 <= Date.now()) return false;
  const mac = createHmac("sha256", secretChecked()).update(`${ticketBody}\n${exp}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  if (given.length !== mac.length) return false;
  try {
    if (!timingSafeEqual(given, mac)) return false;
  } catch {
    return false;
  }
  // Single-use: a token that already unlocked one download is burned.
  // Without consume (unit checks, pre-checks) verification is read-only.
  if (opts.consume) {
    sweepUsedUnlocks();
    if (usedUnlocks.has(token)) return false;
    usedUnlocks.set(token, exp * 1000);
    if (usedUnlocks.size > 5000) {
      const first = usedUnlocks.keys().next();
      if (!first.done) usedUnlocks.delete(first.value);
    }
  }
  return true;
}

const usedUnlocks = new Map<string, number>();

function sweepUsedUnlocks(): void {
  const now = Date.now();
  const stale: string[] = [];
  usedUnlocks.forEach((expMs, tok) => {
    if (now >= expMs) stale.push(tok);
  });
  for (const tok of stale) usedUnlocks.delete(tok);
}

/** For tests only */
export function __resetUnlocks() {
  usedUnlocks.clear();
}

export function ticketBodyOf(ticket: string): string | null {
  const dot = ticket.lastIndexOf(".");
  if (dot < 0) return null;
  return ticket.slice(0, dot);
}

// ---------------------------------------------------------------------------
// Server-side ad sessions. The 30s countdown is measured HERE, not in the
// browser — the client only displays progress and calls complete.
// ---------------------------------------------------------------------------

interface RewardSession {
  ticketBody: string;
  quality: string;
  logId: number | null;
  startedAt: number;
  waitSec: number;
}

const sessions = new Map<string, RewardSession>();
const SESSION_TTL_MS = 20 * 60 * 1000;

function sweepSessions(): void {
  const now = Date.now();
  const stale: string[] = [];
  sessions.forEach((s, id) => {
    if (now - s.startedAt > SESSION_TTL_MS) stale.push(id);
  });
  for (const id of stale) sessions.delete(id);
  if (sessions.size > 5000) {
    const ids: string[] = [];
    sessions.forEach((_s, id) => {
      if (sessions.size - ids.length > 5000) ids.push(id);
    });
    for (const id of ids) sessions.delete(id);
  }
}

/** Start watching: only for tickets THIS server minted. */
export function startRewardSession(
  ticket: string,
  quality: string,
  logId: number | null
): { sessionId: string; waitSec: number } | { error: string } {
  const payload = verifyTicket(ticket);
  if (!payload) return { error: "Invalid or expired download ticket." };
  if (!payload.premium) return { error: "This quality is free — no ad needed." };
  sweepSessions();
  const body = ticketBodyOf(ticket) as string;
  const sessionId = randomUUID();
  const waitSec = adSeconds();
  sessions.set(sessionId, {
    ticketBody: body,
    quality: quality.slice(0, 32),
    logId,
    startedAt: Date.now(),
    waitSec,
  });
  return { sessionId, waitSec };
}

/** Finish watching: token only if the server-measured wait elapsed. */
export function completeRewardSession(
  sessionId: string
): { token: string; exp: number; quality: string; logId: number | null } | { error: string } {
  const s = sessions.get(sessionId);
  if (!s) return { error: "Ad session not found or expired. Please restart the ad." };
  sessions.delete(sessionId);
  const elapsed = (Date.now() - s.startedAt) / 1000;
  // 2s tolerance for timer/network skew — then strict.
  if (elapsed < s.waitSec - 2) {
    return { error: `Ad not finished — please watch the full ${s.waitSec}s.` };
  }
  const { token, exp } = issueUnlockToken(s.ticketBody);
  return { token, exp, quality: s.quality, logId: s.logId };
}
