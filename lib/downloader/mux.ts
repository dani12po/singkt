import { spawn, type ChildProcess } from "node:child_process";
import { Readable } from "node:stream";
import { validateDestinationUrl } from "@/lib/url-security";
import { dlog } from "@/lib/downloader/pipeline";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

const MUX_TIMEOUT_MS = envInt("MUX_TIMEOUT_MS", 300000);

export type MuxContainer = "mp4" | "webm" | "mkv";

export const MUX_MIME: Record<MuxContainer, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
};

let ffmpegOk: boolean | null = null;

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

/** Check once whether ffmpeg is installed. */
export async function muxAvailable(): Promise<boolean> {
  if (ffmpegOk !== null) return ffmpegOk;
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegBin(), ["-version"], { windowsHide: true });
      p.on("error", reject);
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error("bad version"))));
      setTimeout(() => reject(new Error("timeout")), 10000);
    });
    ffmpegOk = true;
  } catch {
    ffmpegOk = false;
  }
  return ffmpegOk;
}

// Concurrency gate: at most N simultaneous mux jobs. Released on EVERY
// path (success, error, client abort) — a leaked slot is a DoS on ourselves.
const MAX_CONCURRENT_MUX = envInt("MAX_CONCURRENT_MUX", 2);
let activeMux = 0;

/** For tests only. */
export function __muxActive(): number {
  return activeMux;
}

function tryAcquireMuxSlot(): boolean {
  if (activeMux >= MAX_CONCURRENT_MUX) return false;
  activeMux += 1;
  return true;
}

function headersArg(referer?: string | null): string {
  let h = `User-Agent: ${UA}\r\n`;
  if (referer && /^https?:\/\/[^/]+/.test(referer)) {
    h += `Referer: ${referer.slice(0, 256)}\r\n`;
  }
  return h;
}

export interface MuxStreamResult {
  stream: ReadableStream<Uint8Array>;
  cleanup: () => void;
}

/**
 * Video (+Audio) → muxed container, streamed straight from ffmpeg stdout.
 * No temp files: the first bytes flow as soon as ffmpeg emits them.
 * - v+a mode: -c copy merge (fast).
 * - hls mode: single HLS manifest input, copy-muxed to the container.
 * Throws MUX_BUSY / LINK_EXPIRED(coded) / FFMPEG_MISSING / validation errors.
 */
export async function muxStream(opts: {
  v?: string;
  a?: string;
  hls?: string;
  cont?: MuxContainer;
  referer?: string | null;
  signal?: AbortSignal | null;
}): Promise<MuxStreamResult> {
  const cont: MuxContainer =
    opts.cont === "webm" || opts.cont === "mkv" ? opts.cont : "mp4";
  if (!(await muxAvailable())) {
    throw new Error("FFMPEG_MISSING");
  }
  if (!tryAcquireMuxSlot()) {
    const e = new Error("MUX_BUSY") as Error & { code?: string };
    e.code = "MUX_BUSY";
    throw e;
  }
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeMux = Math.max(0, activeMux - 1);
    }
  };

  try {
    // SSRF validation immediately before spawn (both inputs).
    const inputs: string[] = [];
    if (opts.hls) {
      const c = await validateDestinationUrl(opts.hls);
      if (!c.ok) throw new Error(c.error);
      inputs.push(c.url);
    } else {
      if (!opts.v || !opts.a) throw new Error("Missing mux inputs.");
      const [cv, ca] = await Promise.all([
        validateDestinationUrl(opts.v),
        validateDestinationUrl(opts.a),
      ]);
      if (!cv.ok) throw new Error(cv.error);
      if (!ca.ok) throw new Error(ca.error);
      inputs.push(cv.url, ca.url);
    }

    const headers = headersArg(opts.referer);
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-protocol_whitelist",
      "file,http,https,tcp,tls,crypto,pipe",
    ];
    if (opts.hls) {
      args.push("-headers", headers, "-i", inputs[0], "-map", "0", "-c", "copy");
    } else {
      args.push(
        "-headers", headers, "-i", inputs[0],
        "-headers", headers, "-i", inputs[1],
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c", "copy",
        "-shortest"
      );
    }
    if (cont === "mp4") {
      args.push("-movflags", "frag_keyframe+empty_moov+default_base_moof", "-f", "mp4", "pipe:1");
    } else if (cont === "webm") {
      args.push("-f", "webm", "pipe:1");
    } else {
      args.push("-f", "matroska", "pipe:1");
    }

    dlog("download", `ffmpeg mux spawn (${cont}${opts.hls ? ",hls" : ""})`);
    const child: ChildProcess = spawn(ffmpegBin(), args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    let done = false;
    const finish = (kill: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (kill) {
        try {
          child.kill("SIGKILL");
        } catch {
          // already gone
        }
      }
      release();
    };
    const timer = setTimeout(() => {
      finish(true);
    }, MUX_TIMEOUT_MS);
    // Don't keep the process alive for the timer alone.
    timer.unref?.();

    if (opts.signal) {
      if (opts.signal.aborted) finish(true);
      else opts.signal.addEventListener("abort", () => finish(true), { once: true });
    }

    child.on("error", () => finish(false));
    child.on("close", () => finish(false));

    if (!child.stdout) {
      finish(true);
      throw new Error("ffmpeg produced no output");
    }
    const web = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
    return {
      stream: web,
      cleanup: () => finish(true),
    };
  } catch (e) {
    release();
    throw e;
  }
}
