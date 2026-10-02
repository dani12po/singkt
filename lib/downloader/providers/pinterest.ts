import type { ExtractionResult, PlatformDef } from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";

const HOSTS = new Set(["pinterest.com", "www.pinterest.com", "pin.it"]);

export function isPinterestUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    if (u.hostname === "pin.it") return u.pathname.length > 1;
    return u.pathname.toLowerCase().includes("/pin/");
  } catch {
    return false;
  }
}

export const PinterestProvider: PlatformDef = {
  id: "pinterest",
  platform: "pinterest",
  displayName: "Pinterest",
  icon: "📌",
  supportedPatterns: ["pinterest.com/pin/… (video pin)", "pin.it/… (short link)"],
  canHandle: isPinterestUrl,
  invalidMessage: "This doesn't look like a supported Pinterest URL.",
  resolve(url: string): Promise<ExtractionResult> {
    return extractWithYtDlp("pinterest", url, { originalUrl: url, skipResolve: true });
  },
};
