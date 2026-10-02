import { execFile } from "node:child_process";
import { validateDestinationUrl } from "@/lib/url-security";
import { detectPlatform, type PlatformId } from "@/lib/downloader/detect";
import { resolveUrl } from "@/lib/downloader/resolve-url";
import { createTicket, isPremiumAudio, isPremiumVideo, muxTicketUrl, proxyTicketUrl } from "@/lib/downloader/reward";
import { muxAvailable } from "@/lib/downloader/mux";
import {
  debugEnabled,
  dlog,
  ERROR_MESSAGES,
  type AudioVariant,
  type BuiltVariants,
  type DebugInfo,
  type DownloadVariant,
  type ErrorCode,
  type ExtractionResult,
  type ExtractResult,
  type ImageVariant,
  type MediaMetadata,
  type MediaStream,
} from "@/lib/downloader/pipeline";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function timeoutMs(): number {
  const v = Number(process.env.YTDLP_TIMEOUT_MS ?? "45000");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 45000;
}

function ytDlpCandidates(): string[][] {
  const out: string[][] = [];
  const env = (process.env.YTDLP_PATH || "").trim();
  if (env) out.push(splitExtraArgs(env));
  out.push(["yt-dlp"]);
  // pip installs the `yt_dlp` python module even when the `yt-dlp` shim
  // is not on PATH (common on Windows / minimal VPS images).
  out.push(["python3", "-m", "yt_dlp"]);
  out.push(["python", "-m", "yt_dlp"]);
  if (process.platform === "win32") out.push(["py", "-m", "yt_dlp"]);
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = JSON.stringify(c);
    if (seen.has(k) || c.length === 0 || !c[0]) return false;
    seen.add(k);
    return true;
  });
}

let cachedYtDlpCmd: string[] | null = null;

function isMissingBinaryError(err: unknown, stderr: string): boolean {
  const code = (err as { code?: unknown }).code;
  if (code === "ENOENT") return true;
  const msg = String((err as { message?: unknown }).message ?? "");
  return /command not found|not recognized|ENOENT/i.test(stderr + " " + msg);
}

export function __resetYtDlpCacheForTests(): void {
  cachedYtDlpCmd = null;
}

/** Version probe used by /api/health — tries the same candidates. */
export async function getYtDlpVersion(ms = 15000): Promise<{ ok: boolean; version?: string }> {
  for (const cmd of ytDlpCandidates()) {
    const probed = await new Promise<{ ok: boolean; version?: string; missing?: boolean }>((resolve) => {
      const t = setTimeout(() => resolve({ ok: false }), ms);
      try {
        const p = execFile(cmd[0], [...cmd.slice(1), "--version"], { windowsHide: true }, (err, stdout) => {
          clearTimeout(t);
          if (err) {
            resolve({ ok: false, missing: isMissingBinaryError(err, "") });
            return;
          }
          const first = String(stdout).split("\n")[0].trim().slice(0, 64);
          resolve({ ok: true, version: first || undefined });
        });
        p.on("error", (e) => {
          clearTimeout(t);
          resolve({ ok: false, missing: isMissingBinaryError(e, "") });
        });
      } catch {
        clearTimeout(t);
        resolve({ ok: false });
      }
    });
    if (probed.ok) {
      cachedYtDlpCmd = cmd;
      return { ok: true, version: probed.version };
    }
    if (!probed.missing) return { ok: false };
    // missing binary → try next candidate
  }
  return { ok: false };
}

type ExecResult = { stdout: string; stderr: string };

function execOnce(cmd: string[], args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd[0],
      [...cmd.slice(1), ...args],
      { timeout: timeoutMs(), maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          (err as { stdout?: string; stderr?: string }).stdout = String(stdout);
          (err as { stdout?: string; stderr?: string }).stderr = String(stderr);
          reject(err);
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      }
    );
  });
}

function runYtDlp(args: string[]): Promise<ExecResult> {
  return (async () => {
    const cmds = cachedYtDlpCmd ? [cachedYtDlpCmd, ...ytDlpCandidates()] : ytDlpCandidates();
    const seen = new Set<string>();
    let lastMissing: unknown = null;
    for (const cmd of cmds) {
      const k = JSON.stringify(cmd);
      if (seen.has(k)) continue;
      seen.add(k);
      try {
        const res = await execOnce(cmd, args);
        cachedYtDlpCmd = cmd;
        return res;
      } catch (e) {
        const stderr = String((e as { stderr?: unknown }).stderr ?? (e as { message?: unknown }).message ?? "");
        if (isMissingBinaryError(e, stderr)) {
          lastMissing = e;
          continue;
        }
        throw e;
      }
    }
    const err = new Error(`spawn yt-dlp ENOENT (tried: ${cmds.map((c) => c.join(" ")).join(" | ")})`) as Error & {
      code?: string;
      stderr?: string;
    };
    err.code = "ENOENT";
    err.stderr = String((lastMissing as { stderr?: unknown })?.stderr ?? "");
    throw err;
  })();
}

/** Split YTDLP_EXTRA_ARGS respecting double quotes. Pure — unit tested. */
export function splitExtraArgs(raw: string | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

/** Map yt-dlp stderr to a structured error code. Pure — unit tested. */
export function mapYtDlpError(stderr: string): ErrorCode {
  // Strip URLs/IDs first so "404" inside a video URL can't misclassify.
  const s = stderr.replace(/https?:\/\/\S+/gi, " ").toLowerCase();
  // Age gates first (they mention sign-in too).
  // NOTE: never match bare "age" — it false-positives on "webpage".
  if (
    s.includes("confirm your age") ||
    s.includes("age-restricted") ||
    s.includes("age restricted") ||
    s.includes("age gate") ||
    s.includes("inappropriate for some users")
  ) {
    return "AGE_RESTRICTED";
  }
  if (
    s.includes("confirm you're not a bot") ||
    s.includes("confirm you are not a bot") ||
    s.includes("not a bot") ||
    s.includes("bot check") ||
    s.includes("unusual traffic")
  ) {
    return "BOT_CHECK";
  }
  if (
    s.includes("login required") ||
    s.includes("log in to") ||
    s.includes("please log in") ||
    s.includes("account required") ||
    s.includes("cookies are required")
  ) {
    return "LOGIN_REQUIRED";
  }
  if (
    s.includes("private video") ||
    s.includes("this video is private") ||
    s.includes("this content is private")
  ) {
    return "PRIVATE_CONTENT";
  }
  if (
    s.includes("has been removed") ||
    s.includes("has been deleted") ||
    s.includes("video unavailable") ||
    s.includes("this video is unavailable") ||
    s.includes("video not found") ||
    s.includes("http error 404")
  ) {
    return "MEDIA_DELETED";
  }
  if (
    s.includes("not available in your country") ||
    s.includes("blocked in your country") ||
    s.includes("geo-block") ||
    s.includes("available in another country") ||
    s.includes("ip address is blocked")
  ) {
    return "GEO_RESTRICTED";
  }
  if (
    s.includes("http error 429") ||
    s.includes("too many requests") ||
    s.includes("rate-limit") ||
    s.includes("rate limit")
  ) {
    return "RATE_LIMITED";
  }
  if (s.includes("no video formats found") || s.includes("no media stream")) {
    return "NO_STREAM";
  }
  if (s.includes("unsupported url")) {
    return "UNSUPPORTED_URL";
  }
  if (s.includes("link expired") || s.includes("http error 403") || s.includes("http error 410")) {
    return "LINK_EXPIRED";
  }
  return "EXTRACTION_FAILED";
}

interface YtFormat {
  format_id?: string;
  url?: string;
  ext?: string;
  protocol?: string;
  vcodec?: string;
  acodec?: string;
  width?: number | null;
  height?: number | null;
  abr?: number | null;
  tbr?: number | null;
  fps?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  format_note?: string;
  has_drm?: boolean;
}

const VIDEO_EXTS = new Set(["mp4", "webm", "m4v", "mov"]);

/** Streaming protocols we can actually proxy as files (no HLS/DASH manifests, no RTSP). */
function isDirectStream(f: YtFormat): boolean {
  const p = (f.protocol ?? "").toLowerCase();
  if (!p) return true; // yt-dlp omits protocol for plain http(s) files
  if (/m3u8|m3u8_native|rtsp|rtmp|mms|f4m|smooth/.test(p)) return false;
  return true;
}

function sizeOf(f: YtFormat): number | null {
  if (typeof f.filesize === "number") return f.filesize;
  if (typeof f.filesize_approx === "number") return f.filesize_approx;
  return null;
}

function proxyUrl(
  remote: string,
  kind: "video" | "audio" | "thumbnail",
  fn: string,
  premium: boolean,
  ref?: string
): string {
  return proxyTicketUrl(remote, kind, fn, premium, ref);
}

/** Per-platform Referer sent to upstream CDNs (stored in the ticket). */
export function platformReferer(platform: PlatformId | "generic"): string | undefined {
  switch (platform) {
    case "youtube":
      return "https://www.youtube.com/";
    case "tiktok":
      return "https://www.tiktok.com/";
    case "instagram":
      return "https://www.instagram.com/";
    case "facebook":
      return "https://www.facebook.com/";
    case "twitter":
      return "https://x.com/";
    case "vimeo":
      return "https://vimeo.com/";
    case "pinterest":
      return "https://www.pinterest.com/";
    default:
      return undefined;
  }
}

function safeName(title: string, ext: string): string {
  const base = title
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "media"}.${ext}`;
}

/**
 * Resolution from REAL stream dimensions.
 * Portrait (e.g. 720x1280 reels) uses the short side → "720p",
 * never "1280p". Returns null when dimensions are unknown.
 */
export function normQuality(width: number | null | undefined, height: number | null | undefined): number | null {
  const w = typeof width === "number" ? width : 0;
  const h = typeof height === "number" ? height : 0;
  if (!w || !h) return h || w || null;
  return Math.min(w, h);
}

function qualityLabel(q: number | null, ext: string, hd: boolean): string {
  if (!q) return `${ext.toUpperCase()} video`;
  if (!hd) return `${q}p`;
  if (q >= 1080) return `${q}p Full HD`;
  return `${q}p HD`;
}

function normCodec(c?: string | null): string {
  const s = (c ?? "").toLowerCase();
  if (/^(avc|h264)/.test(s)) return "h264";
  if (/^(hev|h265|hvc)/.test(s)) return "hevc";
  if (/^av0?1/.test(s)) return "av1";
  if (/^vp9/.test(s)) return "vp9";
  if (/^vp8/.test(s)) return "vp8";
  if (/mp4a|aac/.test(s)) return "aac";
  if (/^opus/.test(s)) return "opus";
  if (/vorbis/.test(s)) return "vorbis";
  if (/^mp3|mpeg/.test(s)) return "mp3";
  return s || "unknown";
}

/**
 * Output container by codec compatibility:
 * mp4 for h264/hevc/av1 + aac; webm for vp9/av1 + opus;
 * mkv for anything mixed/unknown (most tolerant, still copy-muxed).
 */
export function muxContainer(vcodec?: string | null, acodec?: string | null): "mp4" | "webm" | "mkv" {
  const v = normCodec(vcodec);
  const a = normCodec(acodec);
  if (["h264", "hevc", "av1"].includes(v) && a === "aac") return "mp4";
  if (["vp9", "av1", "vp8"].includes(v) && ["opus", "vorbis"].includes(a)) return "webm";
  return "mkv";
}

/**
 * Variant Builder — pure. Turns a yt-dlp format list into honest,
 * downloadable-only video + audio variants, sorted LOW → HIGH.
 * Never invents qualities: only streams that truly exist are listed.
 */
export function buildMedia(
  title: string,
  formats: YtFormat[],
  opts: { mux?: boolean; ref?: string } = {}
): BuiltVariants {
  const allowMux = opts.mux !== false;
  const ref = opts.ref;
  const usable = formats.filter(
    (f) =>
      f.url &&
      !f.has_drm &&
      isDirectStream(f) &&
      (f.vcodec !== "none" || f.acodec !== "none")
  );
  const video: DownloadVariant[] = [];
  const audio: AudioVariant[] = [];

  // Best audio tracks first (muxed variants reference the best one).
  // Descending, deduped — the top bitrates (160k/256k) must survive.
  const seenAbr = new Set<number>();
  const audioOnly = usable
    .filter((f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none" && f.ext)
    .sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0));
  const audios: YtFormat[] = [];
  for (const f of audioOnly) {
    if (audios.length >= 4) break;
    const abr = Math.round(f.abr ?? f.tbr ?? 0);
    if (abr && seenAbr.has(abr)) continue;
    if (abr) seenAbr.add(abr);
    audios.push(f);
  }
  const bestAudio = [...audios].sort(
    (a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0)
  )[0];

  for (const f of audios) {
    const ext = f.ext as string;
    const abr = Math.round(f.abr ?? f.tbr ?? 0);
    const q = abr ? `${abr}kbps` : "audio";
    const sz = sizeOf(f);
    audio.push({
      type: "audio",
      id: f.format_id ?? ext,
      label: `Audio ${ext.toUpperCase()}${abr ? ` ${abr}kbps` : ""}`,
      quality: q,
      format: ext,
      bitrate: abr || null,
      downloadable: true,
      url: proxyUrl(f.url as string, "audio", safeName(title, ext), isPremiumAudio(abr || null), ref),
      sizeBytes: sz,
      filesize: sz,
      premium: isPremiumAudio(abr || null),
    });
  }

  const muxUrl = (f: YtFormat, fn: string, premium: boolean, q: string): string => {
    if (!bestAudio?.url) return proxyUrl(f.url as string, "video", fn, premium, ref);
    const cont = muxContainer(f.vcodec, bestAudio.acodec);
    const name = fn.replace(/\.[a-z0-9]+$/i, "") + `.${cont}`;
    return muxTicketUrl(f.url as string, bestAudio.url as string, name, premium, q, cont, ref);
  };

  // 1. Combined (audio+video) single-file formats — directly playable.
  //    Take the HIGHEST distinct qualities first (up to 6 total below).
  const combined = usable
    .filter(
      (f) =>
        f.vcodec &&
        f.vcodec !== "none" &&
        f.acodec &&
        f.acodec !== "none" &&
        f.ext &&
        VIDEO_EXTS.has(f.ext)
    )
    .sort((a, b) => {
      const qa = normQuality(a.width, a.height) ?? 0;
      const qb = normQuality(b.width, b.height) ?? 0;
      return qb - qa || (b.tbr ?? 0) - (a.tbr ?? 0);
    });

  const seenQ = new Set<number>();
  for (const f of combined) {
    if (video.length >= 6) break;
    const q = normQuality(f.width, f.height);
    if (q && seenQ.has(q)) continue;
    if (q) seenQ.add(q);
    const ext = f.ext as string;
    const sz = sizeOf(f);
    video.push({
      type: "video",
      id: f.format_id ?? `${q ?? "sd"}p`,
      label: qualityLabel(q, ext, true),
      quality: q ? `${q}p` : ext.toUpperCase(),
      downloadable: true,
      url: proxyUrl(f.url as string, "video", safeName(title, ext), isPremiumVideo(q), ref),
      width: f.width ?? null,
      height: f.height ?? null,
      format: ext,
      sizeBytes: sz,
      filesize: sz,
      premium: isPremiumVideo(q),
      source: "direct",
    });
  }

  // 2. Separated DASH streams → server-side muxed MP4 (video+audio).
  //    Runs even when combined formats exist, for qualities they don't
  //    cover (e.g. combined 360p + DASH 720p/1080p). A video-only stream
  //    is NEVER presented as a final file when audio is available.
  if (allowMux && bestAudio?.url) {
    const seen = new Set<number>(seenQ);
    const videoOnly = usable
      .filter(
        (f) =>
          f.vcodec &&
          f.vcodec !== "none" &&
          (!f.acodec || f.acodec === "none") &&
          f.ext &&
          VIDEO_EXTS.has(f.ext)
      )
      // Highest first: top qualities win the remaining slots.
      .sort((a, b) => {
        const qa = normQuality(a.width, a.height) ?? 0;
        const qb = normQuality(b.width, b.height) ?? 0;
        return qb - qa || (b.tbr ?? 0) - (a.tbr ?? 0);
      });
    for (const f of videoOnly) {
      if (video.length >= 6) break;
      const q = normQuality(f.width, f.height);
      if (q && seen.has(q)) continue;
      if (q) seen.add(q);
      const ext = muxContainer(f.vcodec, bestAudio.acodec);
      const sz = sizeOf(f);
      video.push({
        type: "video",
        id: f.format_id ?? `${q ?? "sd"}p`,
        label: qualityLabel(q, ext, true),
        quality: q ? `${q}p` : ext.toUpperCase(),
        downloadable: true,
        url: muxUrl(f, safeName(title, ext), isPremiumVideo(q), q ? `${q}p` : "video"),
        width: f.width ?? null,
        height: f.height ?? null,
        format: ext,
        sizeBytes: sz,
        filesize: sz,
        premium: isPremiumVideo(q),
        source: "muxed",
      });
    }
    video.sort((a, b) => parseInt(a.quality) - parseInt(b.quality));
  }

  // 3. Absolute fallback: direct video-only, honestly labeled (no audio).
  if (video.length === 0) {
    const seen = new Set<number>();
    const videoOnly = usable
      .filter(
        (f) =>
          f.vcodec &&
          f.vcodec !== "none" &&
          f.ext &&
          VIDEO_EXTS.has(f.ext)
      )
      .sort((a, b) => {
        const qa = normQuality(a.width, a.height) ?? 0;
        const qb = normQuality(b.width, b.height) ?? 0;
        return qb - qa;
      });
    for (const f of videoOnly) {
      if (video.length >= 3) break;
      const q = normQuality(f.width, f.height);
      if (q && seen.has(q)) continue;
      if (q) seen.add(q);
      const ext = f.ext as string;
      const sz = sizeOf(f);
      video.push({
        type: "video",
        id: f.format_id ?? `${q ?? "sd"}p`,
        label: q ? `${q}p ${ext.toUpperCase()} (video only)` : `${ext.toUpperCase()} (video only)`,
        quality: q ? `${q}p` : ext.toUpperCase(),
        downloadable: true,
        url: proxyUrl(f.url as string, "video", safeName(title, ext), isPremiumVideo(q), ref),
        width: f.width ?? null,
        height: f.height ?? null,
        format: ext,
        sizeBytes: sz,
        filesize: sz,
        premium: isPremiumVideo(q),
        source: "direct",
        note: "No audio track",
      });
    }
  }

  // 3b. HLS-only sources: offer ffmpeg-converted variants when possible.
  //     Never as direct files (a playlist is not a video file).
  if (video.length === 0 && allowMux) {
    const seen = new Set<number>();
    const hls = formats
      .filter(
        (f) =>
          f.url &&
          !f.has_drm &&
          /m3u8/.test((f.protocol ?? "").toLowerCase()) &&
          f.vcodec &&
          f.vcodec !== "none"
      )
      .sort((a, b) => (normQuality(b.width, b.height) ?? 0) - (normQuality(a.width, a.height) ?? 0));
    for (const f of hls) {
      if (video.length >= 3) break;
      const q = normQuality(f.width, f.height);
      if (q && seen.has(q)) continue;
      if (q) seen.add(q);
      const cont = muxContainer(f.vcodec, f.acodec);
      const sz = sizeOf(f);
      const { ticket } = createTicket({
        hls: f.url as string,
        kind: "video",
        fn: safeName(title, cont),
        premium: isPremiumVideo(q),
        cont,
        ref,
      });
      video.push({
        type: "video",
        id: f.format_id ?? `${q ?? "hls"}p`,
        label: q ? `${q}p ${cont.toUpperCase()}` : `${cont.toUpperCase()} video`,
        quality: q ? `${q}p` : cont.toUpperCase(),
        downloadable: true,
        url: `/api/media/mux?t=${ticket}`,
        width: f.width ?? null,
        height: f.height ?? null,
        format: cont,
        sizeBytes: sz,
        filesize: sz,
        premium: isPremiumVideo(q),
        source: "muxed",
        note: "Converted live from stream",
      });
    }
  }

  // Display order is always low → high, regardless of selection path.
  video.sort((a, b) => parseInt(a.quality) - parseInt(b.quality));

  return { video, audio };
}

/** Back-compat helper: all video variants flattened. */
export function buildVariants(title: string, formats: YtFormat[]): DownloadVariant[] {
  const { video } = buildMedia(title, formats);
  return video;
}

export interface RawThumb {
  url?: string;
  width?: number | null;
  height?: number | null;
  id?: string;
}

/**
 * Gallery builder — pure. Turns the extractor's thumbnail list into
 * downloadable photo assets (covers, gallery thumbs). Only URLs that
 * truly exist are listed, deduplicated, capped.
 */
export function buildImages(title: string, thumbnails: RawThumb[]): ImageVariant[] {  const seen = new Set<string>();
  const out: ImageVariant[] = [];
  for (const t of thumbnails) {
    if (out.length >= 8) break;
    const u = (t.url ?? "").trim();
    if (!u || !/^https?:\/\//.test(u) || seen.has(u)) continue;
    seen.add(u);
    const w = typeof t.width === "number" ? t.width : null;
    const h = typeof t.height === "number" ? t.height : null;
    out.push({
      type: "image",
      label: w && h ? `Photo ${w}×${h}` : "Photo",
      downloadable: true,
      url: proxyTicketUrl(u, "thumbnail", safeName(title, "jpg"), false),
      width: w,
      height: h,
      premium: false,
    });
  }
  return out;
}

export interface RawInfo {
  title?: string;
  uploader?: string;
  thumbnail?: string;
  duration?: number;
  formats?: YtFormat[];
  thumbnails?: RawThumb[];
}

/** Stage: extract — run yt-dlp and parse raw info. */
export async function extractMediaInfo(
  pageUrl: string
): Promise<{ ok: true; info: RawInfo; pageUrl: string } | { ok: false; code: ErrorCode; stderr: string }> {
  let raw: ExecResult;
  try {
    raw = await runYtDlp([
      "--no-playlist",
      "--no-warnings",
      "--dump-json",
      "--socket-timeout",
      "10",
      "--retries",
      "1",
      "--user-agent",
      UA,
      ...splitExtraArgs(process.env.YTDLP_EXTRA_ARGS),
      pageUrl,
    ]);
  } catch (e) {
    const err = e as { killed?: boolean; code?: string; stderr?: string; message?: string };
    const stderr = String(err.stderr ?? err.message ?? "");
    if (err.killed) return { ok: false, code: "EXTRACTION_FAILED", stderr: "TIMEOUT" };
    if (err.code === "ENOENT" || /command not found|not recognized|ENOENT/i.test(stderr + String(err.message ?? ""))) {
      return { ok: false, code: "EXTRACTION_FAILED", stderr: "YTDLP_MISSING" };
    }
    return { ok: false, code: mapYtDlpError(stderr), stderr };
  }
  try {
    const info = JSON.parse(raw.stdout) as RawInfo;
    return { ok: true, info, pageUrl };
  } catch {
    return { ok: false, code: "EXTRACTION_FAILED", stderr: "BAD_JSON" };
  }
}

/** Stage: getMetadata — project raw info to metadata. */
export function getMetadata(info: RawInfo): MediaMetadata {
  return {
    title: info.title ?? "Media",
    author: info.uploader ?? null,
    thumbnail: info.thumbnail && /^https?:\/\//.test(info.thumbnail) ? info.thumbnail : null,
    durationSec: typeof info.duration === "number" ? Math.round(info.duration) : null,
  };
}

/** Stage: getVariants — split raw formats into typed streams. */
export function getStreams(formats: YtFormat[]): { videoStreams: MediaStream[]; audioStreams: MediaStream[] } {
  const videoStreams: MediaStream[] = [];
  const audioStreams: MediaStream[] = [];
  for (const f of formats) {
    if (!f.url || f.has_drm) continue;
    const isV = !!f.vcodec && f.vcodec !== "none";
    const isA = !!f.acodec && f.acodec !== "none";
    if (!isV && !isA) continue;
    const s: MediaStream = {
      id: f.format_id ?? "unknown",
      url: f.url,
      ext: f.ext ?? "bin",
      width: f.width ?? null,
      height: f.height ?? null,
      abr: typeof f.abr === "number" ? Math.round(f.abr) : null,
      filesize: sizeOf(f),
      videoOnly: isV && !isA,
      audioOnly: isA && !isV,
      combined: isV && isA,
    };
    if (isV) videoStreams.push(s);
    else audioStreams.push(s);
  }
  return { videoStreams, audioStreams };
}

// Only these failures may fall back to a thumbnail — never mask
// private/login-walled/deleted/age-gated content.
export const THUMB_FALLBACK_CODES: ErrorCode[] = [
  "EXTRACTION_FAILED",
  "GEO_RESTRICTED",
  "LINK_EXPIRED",
  "NO_VARIANTS",
  "NO_STREAM",
  "RATE_LIMITED",
];

interface OEmbedData {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

async function fetchOEmbed(endpoint: string, pageUrl: string): Promise<OEmbedData | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const res = await fetch(`${endpoint}?url=${encodeURIComponent(pageUrl)}`, {
      signal: c.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as OEmbedData;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const OEMBED_ENDPOINTS: Partial<Record<PlatformId, string>> = {
  youtube: process.env.YOUTUBE_OEMBED_ENDPOINT || "https://www.youtube.com/oembed",
  tiktok: process.env.TIKTOK_OEMBED_ENDPOINT || "https://www.tiktok.com/oembed",
  vimeo: process.env.VIMEO_OEMBED_ENDPOINT || "https://vimeo.com/api/oembed.json",
};

/**
 * Thumbnail fallback: when video extraction fails but public metadata
 * exists, still return ONE real downloadable file (the thumbnail)
 * plus the honest reason video is unavailable.
 */
async function oEmbedThumbnailFallback(
  platform: PlatformId,
  pageUrl: string,
  failedCode: ErrorCode,
  failedError: string,
  debug: DebugInfo | null
): Promise<ExtractionResult | null> {
  const endpoint = OEMBED_ENDPOINTS[platform];
  if (!endpoint || !THUMB_FALLBACK_CODES.includes(failedCode)) return null;
  const data = await fetchOEmbed(endpoint, pageUrl);
  if (!data || !data.thumbnail_url || !/^https?:\/\//.test(data.thumbnail_url)) {
    return null;
  }
  const title = data.title ?? "Media";
  const thumb = proxyTicketUrl(data.thumbnail_url, "thumbnail", safeName(title, "jpg"), false);
  dlog("variants", "1 thumbnail variant (video unavailable)", [failedCode]);
  const gallery = buildImages(title, [{ url: data.thumbnail_url }]);
  return {
    success: true,
    platform,
    title,
    thumbnail: thumb,
    author: data.author_name ?? null,
    durationSec: null,
    duration: null,
    sourceUrl: pageUrl,
    resolvedUrl: pageUrl,
    canonicalUrl: pageUrl,
    extractor: "oembed-thumbnail",
    variants: [
      {
        type: "video",
        id: "thumbnail",
        label: "Thumbnail image",
        quality: "image",
        downloadable: true,
        url: thumb,
        width: null,
        height: null,
        format: "jpg",
        sizeBytes: null,
        filesize: null,
        premium: false,
        source: "direct",
        note: "Video file unavailable",
      },
    ],
    audioVariants: [],
    images: gallery,
    notices: [
      `Video download unavailable right now: ${failedError} You can still save the preview thumbnail below, or try again later.`,
    ],
    debug,
  };
}

/**
 * Media Extraction via yt-dlp (no credentials, no DRM/paywall bypass —
 * DRM formats expose no direct URL and are skipped).
 *
 * Pipeline: resolve → extract → getMetadata/getStreams → buildMedia.
 */
export async function extractWithYtDlp(
  platform: PlatformId,
  pageUrl: string,
  opts: { originalUrl?: string; canonicalUrl?: string; skipResolve?: boolean } = {}
): Promise<ExtractionResult> {
  const originalUrl = opts.originalUrl ?? pageUrl;
  const detected = detectPlatform(pageUrl);
  dlog("detect", `${pageUrl} -> ${detected}`);
  dlog("extractor", `yt-dlp selected for platform=${platform}`);

  const debug: DebugInfo | null = debugEnabled()
    ? {
        platform,
        originalUrl,
        resolvedUrl: pageUrl,
        canonicalUrl: opts.canonicalUrl ?? pageUrl,
        extractor: "yt-dlp",
        metadata: "FAILED",
        videoStreams: 0,
        audioStreams: 0,
        variants: 0,
        audioVariants: 0,
        error: null,
      }
    : null;

  // Universal resolver — SKIPPED when the caller (handleResolve/provider)
  // already resolved: yt-dlp follows redirects itself, so a second
  // resolve would only double the work, never add information.
  const resolved = opts.skipResolve
    ? { ok: true as const, originalUrl: pageUrl, finalUrl: pageUrl, platform: detectPlatform(pageUrl) as PlatformId | "generic", hops: [] as string[] }
    : await resolveUrl(pageUrl);
  if (!resolved.ok) {
    dlog("extract-fail", `resolve failed: ${resolved.error}`);
    if (debug) debug.error = resolved.error;
    return { success: false, platform, code: "UNSUPPORTED_URL", error: resolved.error };
  }
  if (!opts.skipResolve && resolved.finalUrl !== resolved.originalUrl) {
    dlog("resolve", `${resolved.originalUrl} -> ${resolved.finalUrl}`);
  }
  const canonicalUrl = opts.canonicalUrl ?? resolved.finalUrl;
  if (debug) {
    debug.resolvedUrl = resolved.finalUrl;
    debug.canonicalUrl = canonicalUrl;
  }

  const check = await validateDestinationUrl(resolved.finalUrl);
  if (!check.ok) {
    dlog("extract-fail", `security validation failed: ${check.error}`);
    if (debug) debug.error = check.error;
    return { success: false, platform, code: "UNSUPPORTED_URL", error: check.error };
  }

  const extracted = await extractMediaInfo(check.url);
  if (!extracted.ok) {
    if (extracted.stderr === "YTDLP_MISSING") {
      dlog("extract-fail", "yt-dlp binary not available (tried yt-dlp + python -m yt_dlp)");
      if (debug) debug.error = "yt-dlp missing";
      return {
        success: false,
        platform,
        code: "EXTRACTION_FAILED",
        error:
          "Video extractor is not installed on the server (yt-dlp missing). Admin: install with `pip install yt-dlp`, pastikan YTDLP_PATH benar, lalu cek /api/health.",
      };
    }
    if (extracted.stderr === "TIMEOUT") {
      dlog("extract-fail", "yt-dlp timed out");
      const fb = await oEmbedThumbnailFallback(platform, originalUrl, "EXTRACTION_FAILED", "Processing timed out.", debug);
      if (fb) return fb;
      if (debug) debug.error = "timeout";
      return { success: false, platform, code: "EXTRACTION_FAILED", error: "Processing timed out. Coba lagi." };
    }
    if (extracted.stderr === "BAD_JSON") {
      dlog("extract-fail", "yt-dlp returned invalid JSON");
      if (debug) debug.error = "bad json";
      return { success: false, platform, code: "EXTRACTION_FAILED", error: ERROR_MESSAGES.EXTRACTION_FAILED };
    }
    const code = extracted.code;
    dlog("extract-fail", `yt-dlp error -> ${code}`, extracted.stderr.slice(0, 300));
    if (debug) debug.error = `${code}: ${extracted.stderr.slice(0, 200)}`;
    const fbErr = await oEmbedThumbnailFallback(platform, originalUrl, code, ERROR_MESSAGES[code], debug);
    if (fbErr) return fbErr;
    return { success: false, platform, code, error: ERROR_MESSAGES[code] };
  }

  const metadata = getMetadata(extracted.info);
  const { videoStreams, audioStreams } = getStreams(extracted.info.formats ?? []);
  if (debug) {
    debug.metadata = "SUCCESS";
    debug.videoStreams = videoStreams.length;
    debug.audioStreams = audioStreams.length;
  }

  const { video, audio } = buildMedia(metadata.title, extracted.info.formats ?? [], {
    // Never offer muxed variants when ffmpeg is missing (they would 501).
    mux: await muxAvailable(),
    ref: platformReferer(platform),
  });
  dlog("extract-ok", `extracted "${metadata.title}"`);
  dlog("variants", `${video.length} video + ${audio.length} audio`, [
    ...video.map((v) => v.label),
    ...audio.map((a) => a.label),
  ]);
  if (debug) {
    debug.variants = video.length;
    debug.audioVariants = audio.length;
  }

  if (video.length === 0 && audio.length === 0) {
    const code: ErrorCode = videoStreams.length + audioStreams.length > 0 ? "NO_VARIANTS" : "NO_STREAM";
    const msg =
      code === "NO_STREAM"
        ? ERROR_MESSAGES.NO_STREAM
        : `${ERROR_MESSAGES.NO_VARIANTS} Judul terdeteksi: "${metadata.title}".`;
    const fbEmpty = await oEmbedThumbnailFallback(platform, originalUrl, code, msg, debug);
    if (fbEmpty) return fbEmpty;
    if (debug) debug.error = msg;
    return { success: false, platform, code, error: msg };
  }

  const thumb =
    metadata.thumbnail
      ? proxyTicketUrl(metadata.thumbnail, "thumbnail", safeName(metadata.title, "jpg"), false)
      : null;

  return {
    success: true,
    platform,
    title: metadata.title,
    thumbnail: thumb,
    author: metadata.author,
    durationSec: metadata.durationSec,
    duration: metadata.durationSec,
    sourceUrl: originalUrl,
    resolvedUrl: resolved.finalUrl,
    canonicalUrl,
    extractor: "yt-dlp",
    variants: video,
    audioVariants: audio,
    images: buildImages(metadata.title, extracted.info.thumbnails ?? []),
    notices: [],
    debug,
  };
}
