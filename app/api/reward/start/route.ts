import { z } from "zod";
import { NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { startRewardSession } from "@/lib/downloader/reward";
import { guardApiRequest } from "@/lib/api-shield";

const Body = z.object({
  /** Server-minted download ticket (variant URL's `t` param). */
  ticket: z.string().min(1).max(8192),
  quality: z.string().max(32).optional().default(""),
  logId: z.number().int().positive().optional(),
});

/** Step 1: start watching — only tickets THIS server minted are accepted. */
export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`reward:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
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
  const result = startRewardSession(
    parsed.data.ticket,
    parsed.data.quality,
    parsed.data.logId ?? null
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
