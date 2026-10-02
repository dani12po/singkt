import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]);

export function isTwitterUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    return u.pathname.toLowerCase().includes("/status/");
  } catch {
    return false;
  }
}

export const TwitterProvider: PlatformDef = {
  id: "twitter",
  platform: "twitter",
  displayName: "X / Twitter",
  icon: "𝕏",
  supportedPatterns: ["x.com/…/status/…", "twitter.com/…/status/…"],
  canHandle: isTwitterUrl,
  invalidMessage: "This doesn't look like a supported X/Twitter URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("twitter", url, { originalUrl: url, skipResolve: true });
  },
};
