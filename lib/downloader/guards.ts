import { validateDestinationUrl } from "@/lib/url-security";
import type { MediaKind } from "@/lib/downloader/pipeline";

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

export const MEDIA_LIMITS: Record<MediaKind, number> = {
  video: envInt("MEDIA_MAX_VIDEO_BYTES", 300 * 1024 * 1024),
  image: envInt("MEDIA_MAX_IMAGE_BYTES", 25 * 1024 * 1024),
  audio: envInt("MEDIA_MAX_AUDIO_BYTES", 100 * 1024 * 1024),
  thumbnail: envInt("MEDIA_MAX_THUMB_BYTES", 10 * 1024 * 1024),
};

export const MEDIA_TIMEOUT_MS = envInt("MEDIA_FETCH_TIMEOUT_MS", 15000);
// Stall timeout: rearmed on every chunk, so big files can take longer overall.
const CHUNK_TIMEOUT_MS = envInt("MEDIA_CHUNK_TIMEOUT_MS", 30000);
const MAX_REDIRECTS = 3;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const CONTENT_PREFIX: Record<MediaKind, string> = {
  video: "video/",
  image: "image/",
  audio: "audio/",
  thumbnail: "image/",
};

const KIND_EXTS: Record<MediaKind, string[]> = {
  video: ["mp4", "webm", "mov", "m4v", "mkv"],
  image: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  audio: ["mp3", "wav", "m4a", "ogg", "opus", "flac", "aac", "weba"],
  thumbnail: ["jpg", "jpeg", "png", "webp"],
};

export type InspectResult =
  | {
      ok: true;
      url: string;
      contentType: string;
      sizeBytes: number | null;
    }
  | { ok: false; error: string };

function timeoutSignal(ms: number): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

function extOfUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const seg = u.pathname.split("/").pop() ?? "";
    const dot = seg.lastIndexOf(".");
    return dot < 0 ? "" : seg.slice(dot + 1).toLowerCase().split("?")[0];
  } catch {
    return "";
  }
}

function contentOk(kind: MediaKind, ct: string, url: string): boolean {
  if (ct.startsWith(CONTENT_PREFIX[kind])) return true;
  // DASH audio tracks are often served as video/mp4 (m4a-in-mp4).
  if (kind === "audio" && ct === "video/mp4") return true;
  // Some CDNs serve application/octet-stream — accept only when the URL
  // extension matches the expected kind (never blindly).
  if (ct === "application/octet-stream") {
    return KIND_EXTS[kind].includes(extOfUrl(url));
  }
  return false;
}

/** Ranged GET probe (bytes 0-1023): works where HEAD lies or redirects oddly. */
async function probeRange(
  url: string,
  signal: AbortSignal
): Promise<
  | { type: "redirect"; location: string }
  | { type: "result"; status: number; contentType: string; sizeBytes: number | null }
  | { type: "failed" }
> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "*/*", Range: "bytes=0-1023" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return loc ? { type: "redirect", location: loc } : { type: "failed" };
    }
    const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    let size: number | null = null;
    if (res.status === 206) {
      const cr = res.headers.get("content-range") ?? "";
      const m = cr.match(/\/(\d+)\s*$/);
      if (m) size = Number(m[1]);
    } else {
      const cl = res.headers.get("content-length");
      const n = cl ? Number(cl) : NaN;
      if (Number.isFinite(n)) size = n;
    }
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }
    if (!res.ok) return { type: "failed" };
    return { type: "result", status: res.status, contentType: ct, sizeBytes: size };
  } catch {
    return { type: "failed" };
  }
}

/**
 * Validate + follow redirects (re-validating each hop against SSRF) +
 * verify reachability, content-type and size via HEAD (GET fallback).
 * Sends a browser UA so picky CDNs don't 403 the probe.
 */
export async function inspectMedia(
  rawUrl: string,
  kind: MediaKind,
  timeoutMs = MEDIA_TIMEOUT_MS
): Promise<InspectResult> {
  let current = rawUrl.trim();
  const limit = MEDIA_LIMITS[kind];

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = await validateDestinationUrl(current);
    if (!check.ok) return { ok: false, error: check.error };
    current = check.url;

    const { signal, done } = timeoutSignal(timeoutMs);
    try {
      const headers = { "User-Agent": UA, Accept: "*/*" };
      let res = await fetch(current, { method: "HEAD", signal, redirect: "manual", headers });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (loc) {
          current = new URL(loc, current).toString();
          continue;
        }
        // Location-less redirect (CDN quirk) — fall through to range probe.
      } else if (![401, 403, 405, 407, 429, 500, 501, 502].includes(res.status)) {
        if (res.ok) {
          const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
          if (ct && contentOk(kind, ct, current)) {
            const lenRaw = res.headers.get("content-length");
            const size = lenRaw ? Number(lenRaw) : NaN;
            if (Number.isFinite(size) && size > limit) {
              return {
                ok: false,
                error: `File terlalu besar (${Math.round(size / 1048576)} MB, batas ${Math.round(limit / 1048576)} MB).`,
              };
            }
            return {
              ok: true,
              url: current,
              contentType: ct,
              sizeBytes: Number.isFinite(size) ? size : null,
            };
          }
          // HEAD ok but content-type missing/mismatched — verify via range probe.
        } else {
          return { ok: false, error: `Media tidak dapat diakses (HTTP ${res.status}).` };
        }
      }
      // HEAD blocked, odd, or inconclusive — peek with ranged GET.
      const probe = await probeRange(current, signal);
      if (probe.type === "redirect") {
        current = new URL(probe.location, current).toString();
        continue;
      }
      if (probe.type === "failed") {
        return { ok: false, error: "Media tidak dapat diakses." };
      }
      if (!contentOk(kind, probe.contentType, current)) {
        return {
          ok: false,
          error: `URL tersebut bukan file ${kind} yang didukung (terdeteksi: ${probe.contentType || "unknown"}).`,
        };
      }
      if (probe.sizeBytes !== null && probe.sizeBytes > limit) {
        return {
          ok: false,
          error: `File terlalu besar (${Math.round(probe.sizeBytes / 1048576)} MB, batas ${Math.round(limit / 1048576)} MB).`,
        };
      }
      return { ok: true, url: current, contentType: probe.contentType, sizeBytes: probe.sizeBytes };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { ok: false, error: "Memeriksa media timeout. Coba lagi." };
      }
      return { ok: false, error: "Media tidak dapat diakses." };
    } finally {
      done();
    }
  }
  return { ok: false, error: "Terlalu banyak redirect." };
}

/** Fetch JSON with hard timeout. Returns null on any failure. */
export async function fetchJsonWithTimeout(url: string, ms = 8000): Promise<unknown | null> {
  const { signal, done } = timeoutSignal(ms);
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    done();
  }
}

/**
 * Stream a remote file to the client:
 * - redirects are followed MANUALLY with SSRF re-validation per hop
 *   (never trust fetch()'s automatic following here),
 * - a stall timer is rearmed on every chunk (big files may take a while),
 * - byte counts are verified against HEAD so truncation fails loudly,
 * - client Range requests are forwarded → resume works (206 relayed).
 */
export async function streamMediaProxied(
  rawUrl: string,
  kind: MediaKind,
  filename: string,
  opts: { clientRange?: string | null; referer?: string | null } = {}
): Promise<Response | { error: "expired" | "unavailable" }> {
  const inspected = await inspectMedia(rawUrl, kind);
  if (!inspected.ok) return { error: "unavailable" };
  const limit = MEDIA_LIMITS[kind];

  // Manual redirect chain for the GET itself (validated per hop).
  let current = inspected.url;
  const forwardHeaders: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
  };
  if (opts.referer && /^https?:\/\/[^/]+/.test(opts.referer)) {
    forwardHeaders.Referer = opts.referer.slice(0, 256);
  }
  const range = (opts.clientRange ?? "").slice(0, 128);
  const wantRange = /^bytes=\d*-\d*$/.test(range);
  if (wantRange) forwardHeaders.Range = range;

  // Resolve the final URL once (manual redirects, validated per hop).
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = await validateDestinationUrl(current);
    if (!check.ok) return { error: "unavailable" };
    current = check.url;
    const { signal, done } = timeoutSignal(MEDIA_TIMEOUT_MS);
    try {
      const res = await fetch(current, { headers: forwardHeaders, signal, redirect: "manual" });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      const status = res.status;
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      done();
      if (loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      if (status === 403 || status === 410) return { error: "expired" };
      break; // final URL reached (status checked per segment below)
    } catch {
      done();
      return { error: "unavailable" };
    }
  }

  // Client Range requests stay single-shot (resume semantics preserved).
  if (wantRange) {
    return streamSingle(current, forwardHeaders, filename, {
      kind,
      limit,
      contentType: inspected.contentType,
      expected: null,
      relayRange: true,
    });
  }

  const total = inspected.sizeBytes;
  // Large files: sequential ranged segments (fresh connection per segment
  // defeats per-connection throttling, like yt-dlp's chunked downloads).
  if (total !== null && total > segmentBytes()) {
    return streamSegmented(current, forwardHeaders, filename, {
      kind,
      limit,
      contentType: inspected.contentType,
      total,
    });
  }
  return streamSingle(current, forwardHeaders, filename, {
    kind,
    limit,
    contentType: inspected.contentType,
    expected: total,
    relayRange: false,
  });
}

const segmentBytes = (): number => envInt("MEDIA_SEGMENT_BYTES", 10 * 1024 * 1024);

interface StreamOpts {
  kind: MediaKind;
  limit: number;
  contentType: string;
  /** Exact byte total the stream must deliver (null = unknown). */
  expected: number | null;
  relayRange: boolean;
}

function byteCounter(
  limit: number,
  expected: number | null,
  onStall: () => void,
  cancelUpstream: () => void,
  stallCheck = true
): {
  transform: TransformStream<Uint8Array, Uint8Array>;
  getBytes: () => number;
} {
  let bytes = 0;
  let stall: ReturnType<typeof setTimeout> | null = null;
  const arm = (onStall: () => void) => {
    if (!stallCheck) return;
    if (stall) clearTimeout(stall);
    stall = setTimeout(() => {
      try {
        cancelUpstream();
      } catch {
        // ignore
      }
      onStall();
    }, CHUNK_TIMEOUT_MS);
  };
  const disarm = () => {
    if (stall) {
      clearTimeout(stall);
      stall = null;
    }
  };
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    start(c) {
      arm(() => {
        try {
          c.error(new Error("Upstream stall timeout"));
        } catch {
          // already closed
        }
        disarm();
      });
    },
    transform(chunk, controller) {
      arm(() => controller.error(new Error("Upstream stall timeout")));
      bytes += chunk.byteLength;
      if (bytes > limit) {
        disarm();
        controller.error(new Error("File exceeds size limit"));
        try {
          cancelUpstream();
        } catch {
          // ignore
        }
        return;
      }
      controller.enqueue(chunk);
    },
    flush() {
      disarm();
      // Loud failure beats silent corruption.
      if (expected !== null && bytes !== expected) {
        throw new Error(`Truncated stream: got ${bytes} of ${expected} bytes`);
      }
    },
  });
  return { transform, getBytes: () => bytes };
}

function disposition(filename: string): string {
  const ascii = filename.replace(/["\r\n]/g, "").replace(/[^\x20-\x7e]/g, "_") || "download";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Single-shot download (small files + client Range passthrough). */
async function streamSingle(
  url: string,
  headers: Record<string, string>,
  filename: string,
  o: StreamOpts
): Promise<Response | { error: "expired" | "unavailable" }> {
  const { signal, done } = timeoutSignal(MEDIA_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, signal, redirect: "manual" });
  } catch {
    done();
    return { error: "unavailable" };
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    try {
      await upstream.body?.cancel();
    } catch {
      // ignore
    }
    done();
    return { error: "unavailable" };
  }
  if (upstream.status === 403 || upstream.status === 410) {
    try {
      await upstream.body?.cancel();
    } catch {
      // ignore
    }
    done();
    return { error: "expired" };
  }
  if (!upstream.ok || !upstream.body) {
    try {
      await upstream.body?.cancel();
    } catch {
      // ignore
    }
    done();
    return { error: "unavailable" };
  }
  done();
  let cancelled = false;
  const { transform } = byteCounter(
    o.limit,
    o.expected,
    () => {},
    () => {
      cancelled = true;
      try {
        upstream.body?.cancel();
      } catch {
        // ignore
      }
    }
  );
  void cancelled;
  const outHeaders = new Headers();
  outHeaders.set("Content-Type", o.contentType);
  outHeaders.set("Content-Disposition", disposition(filename));
  outHeaders.set("Cache-Control", "private, max-age=60");
  outHeaders.set("X-Content-Type-Options", "nosniff");
  outHeaders.set("Accept-Ranges", "bytes");
  if (o.relayRange && upstream.status === 206) {
    const cr = upstream.headers.get("content-range");
    const cl = upstream.headers.get("content-length");
    if (cr) outHeaders.set("Content-Range", cr);
    if (cl) outHeaders.set("Content-Length", cl);
    const piped = (upstream.body as ReadableStream<Uint8Array>).pipeThrough(transform);
    return new Response(piped, { status: 206, headers: outHeaders });
  }
  if (o.expected !== null) outHeaders.set("Content-Length", String(o.expected));
  const piped = (upstream.body as ReadableStream<Uint8Array>).pipeThrough(transform);
  return new Response(piped, { headers: outHeaders });
}

/**
 * Segmented download: consecutive `Range` requests (default 10 MB),
 * streamed in order through one byte-counting transform. Each segment
 * is verified (206 + exact length); any deviation fails loudly.
 */
async function streamSegmented(
  url: string,
  baseHeaders: Record<string, string>,
  filename: string,
  o: { kind: MediaKind; limit: number; contentType: string; total: number }
): Promise<Response | { error: "expired" | "unavailable" }> {
  const total = o.total;
  // Verify the first segment synchronously so auth/expiry errors surface
  // as JSON (not a broken stream).
  const first = await fetchSegment(url, baseHeaders, 0, Math.min(segmentBytes(), total) - 1, null);
  if ("error" in first) return first;
  let nextStart = first.data.length;
  const { transform } = byteCounter(
    o.limit,
    total,
    () => {},
    () => {},
    false // stall is enforced per segment read, not here
  );
  const writer = transform.writable.getWriter();
  const pumpCtrl = new AbortController();
  // Pump segments sequentially in the background.
  (async () => {
    try {
      await writer.write(first.data);
      while (nextStart < total) {
        const end = Math.min(nextStart + segmentBytes(), total) - 1;
        const seg = await fetchSegment(url, baseHeaders, nextStart, end, pumpCtrl.signal);
        if ("error" in seg) {
          throw new Error(seg.error);
        }
        await writer.write(seg.data);
        nextStart += seg.data.length;
        if (seg.data.length === 0) break;
      }
      await writer.close();
    } catch (e) {
      pumpCtrl.abort();
      try {
        await writer.abort(e);
      } catch {
        // already closed
      }
    }
  })();
  const outHeaders = new Headers();
  outHeaders.set("Content-Type", o.contentType);
  outHeaders.set("Content-Disposition", disposition(filename));
  outHeaders.set("Cache-Control", "private, max-age=60");
  outHeaders.set("X-Content-Type-Options", "nosniff");
  outHeaders.set("Accept-Ranges", "bytes");
  outHeaders.set("Content-Length", String(total));
  return new Response(transform.readable, { headers: outHeaders });
}

/**
 * Fetch one exact byte range. The body is read chunk-by-chunk with a
 * per-chunk stall watchdog (no total timeout), then length-verified —
 * short reads fail loudly instead of corrupting the stream.
 * A 200 full-body reply is only accepted for the first segment and only
 * when its length matches the known total.
 */
async function fetchSegment(
  url: string,
  baseHeaders: Record<string, string>,
  start: number,
  end: number,
  parentSignal: AbortSignal | null
): Promise<{ data: Uint8Array } | { error: "expired" | "unavailable" }> {
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort();
  if (parentSignal) {
    if (parentSignal.aborted) ctrl.abort();
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const overall = setTimeout(() => ctrl.abort(), 30 * 60 * 1000);
  try {
    const res = await fetch(url, {
      headers: { ...baseHeaders, Range: `bytes=${start}-${end}` },
      signal: ctrl.signal,
      redirect: "manual",
    });
    if (res.status === 403 || res.status === 410) {
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return { error: "expired" };
    }
    if (!res.body) return { error: "unavailable" };
    if (res.status !== 206 && res.status !== 200) {
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
      return { error: "unavailable" };
    }
    const want = end - start + 1;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    let stall: ReturnType<typeof setTimeout> | null = null;
    const rearm = () => {
      if (stall) clearTimeout(stall);
      stall = setTimeout(() => {
        try {
          reader.cancel();
        } catch {
          // ignore
        }
      }, CHUNK_TIMEOUT_MS);
    };
    try {
      rearm();
      for (;;) {
        const { done, value } = await reader.read();
        if (stall) {
          clearTimeout(stall);
          stall = null;
        }
        if (done) break;
        if (value) {
          got += value.byteLength;
          if (got > want + 1024) {
            try {
              reader.cancel();
            } catch {
              // ignore oversized body
            }
            return { error: "unavailable" };
          }
          chunks.push(value);
        }
        rearm();
      }
    } catch {
      return { error: "unavailable" };
    } finally {
      if (stall) clearTimeout(stall);
      reader.releaseLock();
    }
    const buf = concat(chunks);
    if (res.status === 200) {
      // Server ignored Range: only usable for segment 0 with exact total.
      if (start !== 0 || buf.length !== want) return { error: "unavailable" };
      return { data: buf };
    }
    if (buf.length !== want) return { error: "unavailable" };
    return { data: buf };
  } catch {
    return { error: "unavailable" };
  } finally {
    clearTimeout(overall);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const c of chunks) len += c.byteLength;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
