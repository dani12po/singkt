import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function isVimeoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    return u.pathname.length > 1;
  } catch {
    return false;
  }
}

export const VimeoProvider: PlatformDef = {
  id: "vimeo",
  platform: "vimeo",
  displayName: "Vimeo",
  icon: "🎥",
  supportedPatterns: ["vimeo.com/… (video ID)", "player.vimeo.com/video/…"],
  canHandle: isVimeoUrl,
  invalidMessage: "This doesn't look like a supported Vimeo URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("vimeo", url, { originalUrl: url, skipResolve: true });
  },
};
