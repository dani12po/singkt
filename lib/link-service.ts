import { prisma } from "@/lib/db";
import { parseUserAgent } from "@/lib/utils";

/** Shared lookup used by redirect + preview + stats. */
export async function lookupLink(code: string) {
  const normalized = code.trim().slice(0, 64);
  const link =
    (await prisma.shortLink.findUnique({ where: { shortCode: normalized } })) ??
    (await prisma.shortLink.findUnique({
      where: { customAlias: normalized },
    }));
  return link;
}

/** Record a click without storing IPs (privacy-first). Never throws. */
export async function recordClick(req: Request, shortCode: string) {
  try {
    const ua = req.headers.get("user-agent");
    const { device, browser } = parseUserAgent(ua);
    const ref = (req.headers.get("referer") ?? "").slice(0, 512) || null;
    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;
    await Promise.race([
      prisma.$transaction([
        prisma.shortLink.update({
          where: { shortCode },
          data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
        }),
        prisma.clickEvent.create({
          data: { shortCode, device, browser, referrer: ref, country },
        }),
      ]),
      // Never let analytics hang the redirect.
      new Promise((_, rej) => setTimeout(() => rej(new Error("click-timeout")), 3000)),
    ]);
    // Retention cleanup runs probabilistically (~1%) and at most hourly —
    // never inside the click's critical path on every request.
    if (Math.random() < 0.01) void pruneClicks();
  } catch {
    // Analytics must never break redirects.
  }
}

let lastPrune = 0;

/** Retention cleanup runs at most once an hour — never on every click. */
async function pruneClicks(): Promise<void> {
  const now = Date.now();
  if (now - lastPrune < 3600000) return;
  lastPrune = now;
  try {
    await prisma.clickEvent.deleteMany({
      where: { createdAt: { lt: new Date(now - 90 * 24 * 3600 * 1000) } },
    });
  } catch {
    // ignore
  }
}
