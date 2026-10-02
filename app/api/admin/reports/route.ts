import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const reports = await prisma.abuseReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ reports });
}

export async function PATCH(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const { id, status } = body ?? {};
  if (!id || !["reviewed", "actioned", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  let updated;
  try {
    updated = await prisma.abuseReport.update({
      where: { id: Number(id) },
      data: { status: String(status) },
    });
  } catch {
    return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  }
  // If actioned, auto-disable the reported link
  if (status === "actioned") {
    await prisma.shortLink
      .update({
        where: { shortCode: updated.shortCode },
        data: { status: "disabled", isFlagged: true },
      })
      .catch(() => null);
  }
  return NextResponse.json({ ok: true, report: updated });
}
