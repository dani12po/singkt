import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
]);

function pathOk(p: string): boolean {
  const seg = p.split("/").filter(Boolean);
  if (seg.length === 0) return false;
  const head = seg[0];
  if (["p", "reel", "reels", "tv", "share"].includes(head)) return true;
  // User-scoped shapes: /{user}/reel/…, /{user}/p/…
  if (seg.length >= 2 && ["p", "reel", "reels"].includes(seg[1])) return true;
  return false;
}

export function isInstagramUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    return pathOk(u.pathname.toLowerCase());
  } catch {
    return false;
  }
}

export const InstagramProvider: PlatformDef = {
  id: "instagram",
  platform: "instagram",
  displayName: "Instagram",
  icon: "📸",
  supportedPatterns: [
    "instagram.com/p/… (photo/video)",
    "instagram.com/reel/…",
    "instagram.com/reels/…",
    "instagram.com/{user}/reel/…",
    "instagram.com/share/…",
    "m.instagram.com/…",
    "instagr.am/…",
  ],
  canHandle: isInstagramUrl,
  invalidMessage: "This doesn't look like a supported Instagram URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("instagram", url, { originalUrl: url, skipResolve: true });
  },
};
