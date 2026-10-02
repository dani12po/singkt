/**
 * Pure platform detector — no network, no Node APIs.
 * Safe to import from client components for instant platform badges.
 */

export type PlatformId =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "vimeo"
  | "pinterest";

export const PLATFORM_META: Record<PlatformId, { name: string; icon: string }> = {
  youtube: { name: "YouTube", icon: "▶" },
  tiktok: { name: "TikTok", icon: "🎵" },
  instagram: { name: "Instagram", icon: "📸" },
  facebook: { name: "Facebook", icon: "📘" },
  twitter: { name: "X / Twitter", icon: "𝕏" },
  vimeo: { name: "Vimeo", icon: "🎥" },
  pinterest: { name: "Pinterest", icon: "📌" },
};

const HOST_MAP: Record<string, PlatformId> = {
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "music.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "m.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "vt.tiktok.com": "tiktok",
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.watch": "facebook",
  "twitter.com": "twitter",
  "www.twitter.com": "twitter",
  "x.com": "twitter",
  "www.x.com": "twitter",
  "vimeo.com": "vimeo",
  "www.vimeo.com": "vimeo",
  "player.vimeo.com": "vimeo",
  "pinterest.com": "pinterest",
  "www.pinterest.com": "pinterest",
  "pin.it": "pinterest",
};

/**
 * Detect the platform of a URL.
 * Returns "generic" for recognized http(s) URLs on unknown hosts
 * (fallback to Generic Downloader) and "unknown" for malformed input.
 */
export function detectPlatform(raw: string): PlatformId | "generic" | "unknown" {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return "unknown";
    const hit = HOST_MAP[u.hostname.toLowerCase()];
    return hit ?? "generic";
  } catch {
    return "unknown";
  }
}
