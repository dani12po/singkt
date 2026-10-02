import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

export function isTikTokUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    const short = u.hostname === "vm.tiktok.com" || u.hostname === "vt.tiktok.com";
    if (short) return u.pathname.length > 1;
    const p = u.pathname.toLowerCase();
    return (
      p.includes("/video/") ||
      p.includes("/t/") ||
      p.includes("/photo/") ||
      p.includes("/embed/")
    );
  } catch {
    return false;
  }
}

export const TikTokProvider: PlatformDef = {
  id: "tiktok",
  platform: "tiktok",
  displayName: "TikTok",
  icon: "🎵",
  supportedPatterns: [
    "tiktok.com/@user/video/…",
    "vm.tiktok.com/… (short link)",
    "vt.tiktok.com/… (short link)",
  ],
  canHandle: isTikTokUrl,
  invalidMessage: "Please enter a valid TikTok URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("tiktok", url, { originalUrl: url, skipResolve: true });
  },
};
