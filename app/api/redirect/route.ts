import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordClick } from "@/lib/link-service";
import { blockedReason } from "@/lib/shortlink-service";
import { guardApiRequest } from "@/lib/api-shield";

/**
 * Transparent server-side redirect (reached via middleware rewrite from
 * /:code so the /[locale] segment can coexist without slug conflicts).
 * Same destination for users, bots, and crawlers — no cloaking.
 */
export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().slice(0, 64);
  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
  const link =
    (await prisma.shortLink.findUnique({ where: { shortCode: code } })) ??
    (await prisma.shortLink.findUnique({ where: { customAlias: code } }));

  if (!link) {
    return NextResponse.redirect(new URL(`/?notfound=${encodeURIComponent(code)}`, req.url), 302);
  }
  if (link.status !== "active" || link.isFlagged) {
    return NextResponse.redirect(new URL(`/disabled?c=${encodeURIComponent(code)}`, req.url), 302);
  }
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return NextResponse.redirect(new URL(`/expired?c=${encodeURIComponent(code)}`, req.url), 302);
  }

  try {
    const host = new URL(link.destination).hostname;
    if (await blockedReason(host)) {
      return NextResponse.redirect(new URL(`/disabled?c=${encodeURIComponent(code)}`, req.url), 302);
    }
  } catch {
    // destination was validated at creation; ignore parse errors
  }

  await recordClick(req, link.shortCode);

  return NextResponse.redirect(link.destination, { status: 302 });
}
