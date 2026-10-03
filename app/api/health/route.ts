import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { muxAvailable } from "@/lib/downloader/mux";
import { getYtDlpVersion } from "@/lib/downloader/extractors/ytdlp";

/**
 * Deployment health. No paths or secrets are exposed — only
 * availability flags and the yt-dlp version string.
 */
export async function GET() {
  const [ytdlp, ffmpeg, db] = await Promise.all([
    getYtDlpVersion(15000),
    muxAvailable().then((ok) => ({ ok })),
    prisma
      .$queryRaw`SELECT 1`
      .then(() => ({ ok: true }))
      .catch(() => ({ ok: false })),
  ]);
  const ok = ytdlp.ok && ffmpeg.ok && db.ok;
  const runtime = {
    vercel: Boolean(process.env.VERCEL),
    supported: !process.env.VERCEL,
    note: process.env.VERCEL
      ? "Serverless (Vercel) tidak didukung: butuh VPS + Docker (yt-dlp + ffmpeg). Lihat Dockerfile."
      : undefined,
  };
  return NextResponse.json(
    { ok, ytdlp, ffmpeg, db, runtime, time: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
