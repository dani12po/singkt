import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { prisma } from "@/lib/db";
import { muxAvailable } from "@/lib/downloader/mux";

function checkBin(
  bin: string,
  args: string[],
  ms: number
): Promise<{ ok: boolean; version?: string }> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false }), ms);
    try {
      const p = execFile(bin, args, { windowsHide: true }, (err, stdout) => {
        clearTimeout(t);
        if (err) {
          resolve({ ok: false });
          return;
        }
        const first = String(stdout).split("\n")[0].trim().slice(0, 64);
        resolve({ ok: true, version: first || undefined });
      });
      p.on("error", () => {
        clearTimeout(t);
        resolve({ ok: false });
      });
    } catch {
      clearTimeout(t);
      resolve({ ok: false });
    }
  });
}

/**
 * Deployment health. No paths or secrets are exposed — only
 * availability flags and the yt-dlp version string.
 */
export async function GET() {
  const [ytdlp, ffmpeg, db] = await Promise.all([
    checkBin(process.env.YTDLP_PATH || "yt-dlp", ["--version"], 15000),
    muxAvailable().then((ok) => ({ ok })),
    prisma
      .$queryRaw`SELECT 1`
      .then(() => ({ ok: true }))
      .catch(() => ({ ok: false })),
  ]);
  const ok = ytdlp.ok && ffmpeg.ok && db.ok;
  return NextResponse.json(
    { ok, ytdlp, ffmpeg, db, time: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
