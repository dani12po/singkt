import { NextResponse } from "next/server";
import { streamMediaProxied } from "@/lib/downloader/guards";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { ticketBodyOf, verifyTicket, verifyUnlockToken } from "@/lib/downloader/reward";
import { dlog } from "@/lib/downloader/pipeline";
import { markDownloadStarted } from "@/lib/downloader/event-log";
import { guardApiRequest } from "@/lib/api-shield";

/**
 * Ticket-based streaming download.
 * The ticket (minted at resolve time) carries the upstream URL, kind,
 * filename and premium flag under HMAC — clients cannot forge or
 * alter it, which closes the open-proxy and premium-strip holes.
 */
export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const url = new URL(req.url);
  const ticket = (url.searchParams.get("t") ?? "").slice(0, 8192);
  const lidRaw = url.searchParams.get("lid") ?? "";
  const lid = lidRaw && /^\d+$/.test(lidRaw) ? Number(lidRaw) : null;

  const payload = verifyTicket(ticket);
  if (!payload || !payload.u) {
    return NextResponse.json(
      { error: "Invalid or expired download ticket. Please resolve the URL again.", code: "LINK_EXPIRED" },
      { status: 410 }
    );
  }

  // Thumbnails use a separate generous bucket so they never eat download quota.
  const isThumb = payload.kind === "thumbnail";
  const rl = checkRateLimit(`${isThumb ? "thumb" : "media"}:${ip}`, {
    max: isThumb ? thumbMax() : mediaMax(),
    windowMs: mediaWindow(),
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa menit lagi." },
      { status: 429 }
    );
  }

  // Anti-bypass: premium tickets need an unlock token from a completed ad.
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

  // Pre-download check (?check=1): validate ticket + token + reachability.
  if (url.searchParams.get("check") === "1") {
    const { inspectMedia } = await import("@/lib/downloader/guards");
    const probe = await inspectMedia(payload.u, payload.kind, 10000);
    if (!probe.ok) {
      return NextResponse.json({ ok: false, error: probe.error, code: "LINK_EXPIRED" }, { status: 410 });
    }
    return NextResponse.json({
      ok: true,
      contentType: probe.contentType,
      sizeBytes: probe.sizeBytes,
      filename: payload.fn,
    });
  }

  const res = await streamMediaProxied(payload.u, payload.kind, payload.fn || "download", {
    clientRange: req.headers.get("range"),
    referer: payload.ref ?? null,
  });
  if (!(res instanceof Response)) {
    if (res.error === "expired") {
      return NextResponse.json(
        { error: "Download Link Expired. The download link has expired — please resolve the URL again.", code: "LINK_EXPIRED" },
        { status: 410 }
      );
    }
    return NextResponse.json(
      { error: "File tidak dapat diunduh (tidak valid, terlalu besar, atau tidak dapat diakses)." },
      { status: 422 }
    );
  }
  dlog("download", `stream started kind=${payload.kind} premium=${payload.premium}`, lid ? { logId: lid } : undefined);
  if (lid) void markDownloadStarted(lid, `${payload.kind}${payload.premium ? ":premium" : ":free"}`);
  return res;
}

function mediaMax(): number {
  const v = Number(process.env.RATE_LIMIT_MEDIA_MAX ?? "60");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 60;
}

function thumbMax(): number {
  const v = Number(process.env.RATE_LIMIT_THUMB_MAX ?? "240");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 240;
}

function mediaWindow(): number {
  const v = Number(process.env.RATE_LIMIT_MEDIA_WINDOW_MS ?? "600000");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 600000;
}
