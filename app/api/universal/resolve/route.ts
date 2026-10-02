import { z } from "zod";
import { NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { detectPlatform } from "@/lib/downloader/detect";
import { dlog, statusOf } from "@/lib/downloader/pipeline";
import { resolveUrl } from "@/lib/downloader/resolve-url";
import { logExtraction } from "@/lib/downloader/event-log";
import { pickProvider, SUPPORTED_EXAMPLES } from "@/lib/downloader/universal";
import { guardApiRequest } from "@/lib/api-shield";

const Body = z.object({ url: z.string().min(1).max(2048) });

/**
 * Universal resolver: detect the platform automatically and delegate to
 * the matching provider. Providers stay separated — this only routes.
 */
export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`universal:${ip}`);
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
    return NextResponse.json({ error: "URL tidak valid." }, { status: 400 });
  }
  const originalUrl = parsed.data.url.trim();

  // Expand short links first so detection sees the canonical host.
  const resolved = await resolveUrl(originalUrl);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error, code: "UNSUPPORTED_URL" }, { status: 400 });
  }
  const target = resolved.finalUrl;
  const platform = detectPlatform(target);
  dlog("detect", `universal ${originalUrl} -> ${platform}`);

  const provider = pickProvider(platform, target);

  if (!provider || !provider.canHandle(target)) {
    return NextResponse.json(
      {
        error: `Unsupported link format. Supported: ${SUPPORTED_EXAMPLES}.`,
        code: "UNSUPPORTED_URL",
        platform,
      },
      { status: 400 }
    );
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      provider.resolve(originalUrl),
      new Promise<never>(
        (_, rej) => (timer = setTimeout(() => rej(new Error("timeout")), 90000))
      ),
    ]);
    if (!result.success) {
      void logExtraction({
        platform: result.platform,
        originalUrl,
        resolvedUrl: target,
        status: result.code,
      });
      return NextResponse.json(
        { error: result.error, code: result.code, platform: result.platform },
        { status: statusOf(result.code) }
      );
    }
    const logId = await logExtraction({
      platform: result.platform,
      originalUrl,
      resolvedUrl: result.resolvedUrl,
      status: "ok",
    });
    return NextResponse.json({ ...result, logId });
  } catch {
    return NextResponse.json(
      { error: "Processing timed out. Coba lagi.", code: "EXTRACTION_FAILED" },
      { status: 504 }
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
