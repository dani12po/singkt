import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { guardApiRequest } from "@/lib/api-shield";

const Body = z.object({
  shortCode: z.string().min(1).max(64),
  reason: z.enum(["Phishing", "Malware", "Spam", "Scam", "Other"]),
  detail: z.string().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`report:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak laporan. Coba lagi nanti." },
      { status: 429 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  const code = parsed.data.shortCode.trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "").slice(0, 64);
  await prisma.abuseReport.create({
    data: { shortCode: code, reason: parsed.data.reason, detail: parsed.data.detail },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
