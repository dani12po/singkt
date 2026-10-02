import { NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { ticketBodyOf, verifyTicket, verifyUnlockToken } from "@/lib/downloader/reward";
import { MUX_MIME, muxAvailable, muxStream, type MuxContainer } from "@/lib/downloader/mux";
import { inspectMedia } from "@/lib/downloader/guards";
import { dlog } from "@/lib/downloader/pipeline";
import { markDownloadStarted } from "@/lib/downloader/event-log";
import { guardApiRequest } from "@/lib/api-shield";

function filenameOf(fn: string, cont: MuxContainer): string {
  const base = (fn || "video").replace(/["\r\n/\\]/g, "").slice(0, 128) || "video";
  return base.toLowerCase().endsWith(`.${cont}`) ? base : `${base}.${cont}`;
}

/**
 * Server-side mux, streamed straight from ffmpeg (no temp files):
 * Video + Audio → Final container, or single HLS manifest → container.
 * First bytes flow as soon as ffmpeg emits them.
 */
export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`media:${ip}`, {
    max: Number(process.env.RATE_LIMIT_MEDIA_MAX ?? "60") || 60,
    windowMs: Number(process.env.RATE_LIMIT_MEDIA_WINDOW_MS ?? "600000") || 600000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
      { status: 429 }
    );
  }
  const url = new URL(req.url);
  const ticket = (url.searchParams.get("t") ?? "").slice(0, 8192);
  const lidRaw = url.searchParams.get("lid") ?? "";
  const lid = lidRaw && /^\d+$/.test(lidRaw) ? Number(lidRaw) : null;

  const payload = verifyTicket(ticket);
  const hasInputs = payload && ((payload.v && payload.a) || payload.hls);
  if (!payload || !hasInputs) {
    return NextResponse.json(
      { error: "Invalid or expired download ticket. Please resolve the URL again.", code: "LINK_EXPIRED" },
      { status: 410 }
    );
  }

  if (payload.premium) {
    const token = url.searchParams.get("tok") ?? "";
    const exp = Number(url.searchParams.get("exp") ?? "0");
    const body = ticketBodyOf(ticket);
    if (!body || !verifyUnlockToken(body, token, exp, { consume: true })) {
      return NextResponse.json(
        {
          error: "Premium quality requires watching a rewarded ad first.",
          code: "REWARD_REQUIRED",
        },
        { status: 403 }
      );
    }
  }

  const cont: MuxContainer =
    payload.cont === "webm" || payload.cont === "mkv" ? payload.cont : "mp4";
  const filename = filenameOf(payload.fn, cont);

  // Pre-download check (?check=1): validate + probe without streaming.
  if (url.searchParams.get("check") === "1") {
    const probeUrl = payload.hls ?? payload.v!;
    const probe = await inspectMedia(probeUrl, "video", 10000);
    if (!probe.ok) {
      return NextResponse.json({ ok: false, error: probe.error, code: "LINK_EXPIRED" }, { status: 410 });
    }
    if (!(await muxAvailable())) {
      return NextResponse.json({ ok: false, error: "Video merger unavailable.", code: "EXTRACTION_FAILED" }, { status: 501 });
    }
    return NextResponse.json({ ok: true, contentType: MUX_MIME[cont], filename });
  }

  if (!(await muxAvailable())) {
    return NextResponse.json(
      { error: "Video merger (ffmpeg) is not installed on the server." },
      { status: 501 }
    );
  }

  try {
    const quality = (url.searchParams.get("q") ?? "").slice(0, 16);
    dlog("download", `mux stream started quality=${quality || "?"}`, lid ? { logId: lid } : undefined);
    if (lid) void markDownloadStarted(lid, `mux:${quality || "video"}`);
    const { stream, cleanup } = await muxStream({
      v: payload.v,
      a: payload.a,
      hls: payload.hls,
      cont,
      referer: payload.ref ?? null,
      signal: req.signal,
    });
    // Release the mux slot if the client goes away mid-stream.
    req.signal?.addEventListener("abort", cleanup, { once: true });
    const headers = new Headers();
    headers.set("Content-Type", MUX_MIME[cont]);
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    headers.set("Cache-Control", "private, max-age=60");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(stream, { headers });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "LINK_EXPIRED" || /LINK_EXPIRED/.test(err.message)) {
      return NextResponse.json(
        { error: "Download Link Expired. The download link has expired — please resolve the URL again.", code: "LINK_EXPIRED" },
        { status: 410 }
      );
    }
    if (err.code === "MUX_BUSY") {
      return NextResponse.json(
        { error: "Server sibuk merging video. Coba lagi sebentar.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
    if (/size limit|too large/i.test(err.message)) {
      return NextResponse.json(
        { error: "File terlalu besar untuk diproses server." },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Gagal menggabungkan video dan audio. Coba lagi." },
      { status: 502 }
    );
  }
}
