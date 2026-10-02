import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const _shield = guardApiRequest(_req);
  if (_shield) return _shield;
  const code = params.code.trim().slice(0, 64);
  const link =
    (await prisma.shortLink.findUnique({ where: { shortCode: code } })) ??
    (await prisma.shortLink.findUnique({ where: { customAlias: code } }));
  if (!link) {
    return NextResponse.json({ error: "Shortlink tidak ditemukan." }, { status: 404 });
  }
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const since7 = new Date(now - 7 * day);
  const since30 = new Date(now - 30 * day);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [today, last7, last30, byDevice, byBrowser, byReferrer, byCountry] =
    await Promise.all([
      prisma.clickEvent.count({
        where: { shortCode: link.shortCode, createdAt: { gte: dayStart } },
      }),
      prisma.clickEvent.count({
        where: { shortCode: link.shortCode, createdAt: { gte: since7 } },
      }),
      prisma.clickEvent.count({
        where: { shortCode: link.shortCode, createdAt: { gte: since30 } },
      }),
      prisma.clickEvent.groupBy({
        by: ["device"],
        where: { shortCode: link.shortCode, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.clickEvent.groupBy({
        by: ["browser"],
        where: { shortCode: link.shortCode, createdAt: { gte: since30 } },
        _count: true,
      }),
      prisma.clickEvent.groupBy({
        by: ["referrer"],
        where: { shortCode: link.shortCode, createdAt: { gte: since30 } },
        _count: true,
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
      prisma.clickEvent.groupBy({
        by: ["country"],
        where: { shortCode: link.shortCode, createdAt: { gte: since30 } },
        _count: true,
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
    ]);
  return NextResponse.json({
    shortCode: link.shortCode,
    totalClicks: link.clickCount,
    today,
    last7Days: last7,
    last30Days: last30,
    lastClickedAt: link.lastClickedAt,
    byDevice,
    byBrowser,
    topReferrers: byReferrer,
    topCountries: byCountry,
  });
}
