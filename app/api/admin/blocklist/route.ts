import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const domains = await prisma.blockedDomain.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ domains });
}

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const domain = String(body?.domain ?? "").toLowerCase().trim().slice(0, 253);
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Domain tidak valid." }, { status: 400 });
  }
  const created = await prisma.blockedDomain.upsert({
    where: { domain },
    update: { reason: String(body?.reason ?? "").slice(0, 500) },
    create: { domain, reason: String(body?.reason ?? "").slice(0, 500) },
  });
  return NextResponse.json({ ok: true, domain: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") ?? "").toLowerCase().trim();
  if (!domain) {
    return NextResponse.json({ error: "Domain wajib diisi." }, { status: 400 });
  }
  await prisma.blockedDomain.delete({ where: { domain } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
