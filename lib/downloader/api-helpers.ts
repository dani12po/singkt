import { z } from "zod";
import { NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { dlog, statusOf, type PlatformDef } from "@/lib/downloader/pipeline";
import { resolveUrl } from "@/lib/downloader/resolve-url";
import { logExtraction } from "@/lib/downloader/event-log";

const Body = z.object({ url: z.string().min(1).max(2048) });

/**
 * Shared resolve pipeline. Each page-specific endpoint calls ONLY its own
 * provider — no cross-platform logic here.
 */
export async function handleResolve(
  req: Request,
  opts: { rateKey: string; provider: PlatformDef }
): Promise<NextResponse> {
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`${opts.rateKey}:${ip}`);
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

  // Universal resolver: expand short URLs to canonical before platform check.
  const resolved = await resolveUrl(originalUrl);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error, code: "UNSUPPORTED_URL" }, { status: 400 });
  }
  const target = resolved.finalUrl;

  if (!opts.provider.canHandle(target)) {
    dlog("detect", `${target} rejected by ${opts.provider.id} (shape mismatch)`);
    return NextResponse.json({ error: opts.provider.invalidMessage }, { status: 400 });
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      opts.provider.resolve(originalUrl),
      new Promise<never>(
        (_, rej) =>
          (timer = setTimeout(() => rej(new Error("timeout")), 90000))
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
  } catch (e) {
    // Log the real cause server-side: the client only ever sees 504 here,
    // which hides fast failures (rejected dependency) vs true timeouts.
    dlog("extract-fail", `resolve pipeline threw: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    return NextResponse.json(
      { error: "Processing timed out. Coba lagi.", code: "EXTRACTION_FAILED" },
      { status: 504 }
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
