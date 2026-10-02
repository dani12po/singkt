import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 128);
  const status = url.searchParams.get("status") ?? "";
  const take = Math.min(Number(url.searchParams.get("take") ?? "50") || 50, 200);
  const where: { status?: string; OR?: object[] } = {};
  if (status === "active" || status === "disabled") where.status = status;
  if (q) {
    where.OR = [
      { shortCode: { contains: q } },
      { destination: { contains: q } },
      { customAlias: { contains: q } },
    ];
  }
  const [links, total, reports, flagged] = await Promise.all([
    prisma.shortLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.shortLink.count(),
    prisma.abuseReport.count({ where: { status: "open" } }),
    prisma.shortLink.count({ where: { isFlagged: true } }),
  ]);
  return NextResponse.json({ links, total, openReports: reports, flagged });
}

export async function PATCH(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const { shortCode, action } = body ?? {};
  if (!shortCode || !["disable", "enable"].includes(action)) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  const data =
    action === "disable"
      ? { status: "disabled", isFlagged: true }
      : { status: "active", isFlagged: false };
  try {
    const updated = await prisma.shortLink.update({
      where: { shortCode: String(shortCode) },
      data,
    });
    return NextResponse.json({ ok: true, link: updated });
  } catch {
    return NextResponse.json({ error: "Shortlink tidak ditemukan." }, { status: 404 });
  }
}
