import { z } from "zod";
import { NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { completeRewardSession } from "@/lib/downloader/reward";
import { dlog } from "@/lib/downloader/pipeline";
import { markAdCompleted } from "@/lib/downloader/event-log";
import { guardApiRequest } from "@/lib/api-shield";

const Body = z.object({ sessionId: z.string().min(1).max(128) });

/** Step 2: finish watching — token only if the server-measured wait elapsed. */
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
  const result = completeRewardSession(parsed.data.sessionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  dlog("reward", `ad completed quality=${result.quality}`, result.logId ? { logId: result.logId } : undefined);
  if (result.logId) void markAdCompleted(result.logId, result.quality || "premium");
  return NextResponse.json({ token: result.token, exp: result.exp });
}
