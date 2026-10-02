import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function isYouTubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    if (u.hostname === "youtu.be") return u.pathname.length > 1;
    const p = u.pathname.toLowerCase();
    if ((p === "/watch" && !!u.searchParams.get("v")) || p.startsWith("/shorts/") || p.startsWith("/embed/")) {
      return true;
    }
    // Live replays/streams and legacy /v/ links.
    if ((p.startsWith("/live/") || p.startsWith("/v/")) && u.pathname.length > 6) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const YouTubeProvider: PlatformDef = {
  id: "youtube",
  platform: "youtube",
  displayName: "YouTube",
  icon: "▶",
  supportedPatterns: [
    "youtube.com/watch?v=…",
    "youtube.com/shorts/…",
    "youtu.be/… (short link)",
  ],
  canHandle: isYouTubeUrl,
  invalidMessage: "This doesn't look like a supported YouTube URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("youtube", url, { originalUrl: url, skipResolve: true });
  },
};
