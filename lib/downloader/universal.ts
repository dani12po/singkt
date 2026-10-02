import type { PlatformId } from "@/lib/downloader/detect";
import type { PlatformDef } from "@/lib/downloader/pipeline";
import {
  FacebookProvider,
  GenericAudioProvider,
  GenericImageProvider,
  GenericVideoProvider,
  InstagramProvider,
  PinterestProvider,
  TikTokProvider,
  TwitterProvider,
  VimeoProvider,
  YouTubeProvider,
} from "@/lib/downloader/providers";

export const SUPPORTED_EXAMPLES = [
  "tiktok.com/@user/video/…",
  "facebook.com/reel/…",
  "instagram.com/reel/…",
  "x.com/…/status/…",
  "youtube.com/watch?v=…",
  "vimeo.com/…",
  "pinterest.com/pin/…",
  "direct .mp4 / .mp3 / .jpg links",
].join(", ");

/**
 * Pure platform → provider routing. One place decides; pages and the
 * universal endpoint share it. Returns null when nothing handles the URL.
 */
export function pickProvider(
  platform: PlatformId | "generic" | "unknown",
  targetUrl: string
): PlatformDef | null {
  switch (platform) {
    case "youtube":
      return YouTubeProvider;
    case "tiktok":
      return TikTokProvider;
    case "instagram":
      return InstagramProvider;
    case "facebook":
      return FacebookProvider;
    case "twitter":
      return TwitterProvider;
    case "vimeo":
      return VimeoProvider;
    case "pinterest":
      return PinterestProvider;
    case "generic":
      if (GenericVideoProvider.canHandle(targetUrl)) return GenericVideoProvider;
      if (GenericImageProvider.canHandle(targetUrl)) return GenericImageProvider;
      if (GenericAudioProvider.canHandle(targetUrl)) return GenericAudioProvider;
      return null;
    default:
      return null;
  }
}
