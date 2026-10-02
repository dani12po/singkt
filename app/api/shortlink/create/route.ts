import { createShortLink } from "@/lib/shortlink-service";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiRequest } from "@/lib/api-shield";

const Body = z.object({
  url: z.string().min(1).max(2048),
  customAlias: z.string().max(30).optional().or(z.literal("")),
  expiresIn: z.enum(["none", "1d", "7d", "30d", "90d"]).optional().default("none"),
});

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`shortlink:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
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
  const result = await createShortLink(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(
    {
      shortCode: result.shortCode,
      shortUrl: result.shortUrl,
      expiresAt: result.expiresAt,
    },
    { status: 201 }
  );
}
