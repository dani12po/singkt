import { validateDestinationUrl } from "@/lib/url-security";
import { proxyTicketUrl } from "@/lib/downloader/reward";
import { inspectMedia } from "@/lib/downloader/guards";
import type { MediaKind } from "@/lib/downloader/pipeline";
import {
  dlog,
  type ExtractionResult,
  type PlatformDef,
} from "@/lib/downloader/pipeline";

const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "mkv"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp"]);
const AUDIO_EXT = new Set(["mp3", "wav", "m4a", "ogg", "opus", "weba", "flac", "aac"]);

function extOf(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const seg = u.pathname.split("/").pop() ?? "";
    const dot = seg.lastIndexOf(".");
    if (dot < 0) return "";
    return seg.slice(dot + 1).toLowerCase();
  } catch {
    return "";
  }
}

function fileNameOf(raw: string, fallback: string): string {
  try {
    const u = new URL(raw);
    const seg = decodeURIComponent(u.pathname.split("/").pop() ?? "");
    return seg && seg.includes(".") ? seg.slice(0, 128) : fallback;
  } catch {
    return fallback;
  }
}

export function isVideoFileUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return VIDEO_EXT.has(extOf(raw));
  } catch {
    return false;
  }
}

export function isImageFileUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return IMAGE_EXT.has(extOf(raw));
  } catch {
    return false;
  }
}

export function isAudioFileUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return AUDIO_EXT.has(extOf(raw));
  } catch {
    return false;
  }
}

function makeGeneric(
  id: string,
  displayName: string,
  icon: string,
  kind: MediaKind,
  fallbackExt: string,
  patterns: string[],
  canHandle: (url: string) => boolean,
  invalidMessage: string
): PlatformDef {
  const isAudio = kind === "audio";
  return {
    id,
    platform: "generic",
    displayName,
    icon,
    supportedPatterns: patterns,
    canHandle,
    invalidMessage,
    async resolve(url: string): Promise<ExtractionResult> {
      dlog("detect", `${url} -> generic (${kind})`);
      dlog("extractor", `direct-${kind} selected`);
      const check = await validateDestinationUrl(url);
      if (!check.ok) {
        dlog("extract-fail", check.error);
        return { success: false, platform: "generic", code: "UNSUPPORTED_URL", error: check.error };
      }
      const inspected = await inspectMedia(check.url, kind);
      if (!inspected.ok) {
        dlog("extract-fail", inspected.error);
        return { success: false, platform: "generic", code: "EXTRACTION_FAILED", error: inspected.error };
      }
      const ext = extOf(check.url) || fallbackExt;
      const name = fileNameOf(check.url, `media.${fallbackExt}`);
      const proxy = proxyTicketUrl(inspected.url, kind, name, false);
      dlog("extract-ok", `direct file "${name}"`);
      dlog("variants", "1 variant", [`Original ${ext.toUpperCase()}`]);
      const base = {
        success: true as const,
        platform: "generic" as const,
        title: name,
        thumbnail: kind === "image" ? proxy : null,
        author: null,
        durationSec: null,
        duration: null,
        sourceUrl: check.url,
        resolvedUrl: check.url,
        canonicalUrl: check.url,
        extractor: `direct-${kind}`,
        notices: [],
        debug: null,
        images: [],
      };
      if (isAudio) {        return {
          ...base,
          variants: [],
          audioVariants: [
            {
              type: "audio" as const,
              id: "original",
              label: `Original ${ext.toUpperCase()}`,
              quality: ext.toUpperCase(),
              format: ext,
              bitrate: null,
              downloadable: true as const,
              url: proxy,
              sizeBytes: inspected.sizeBytes,
              filesize: inspected.sizeBytes,
              premium: false,
            },
          ],
        };
      }
      return {
        ...base,
        variants: [
          {
            type: "video" as const,
            id: "original",
            label: `Original ${ext.toUpperCase()}`,
            quality: ext.toUpperCase(),
            downloadable: true as const,
            url: proxy,
            width: null,
            height: null,
            format: ext,
            sizeBytes: inspected.sizeBytes,
            filesize: inspected.sizeBytes,
            premium: false,
            source: "direct" as const,
          },
        ],
        audioVariants: [],
        images:
          kind === "image"
            ? [
                {
                  type: "image" as const,
                  label: `Original ${ext.toUpperCase()}`,
                  downloadable: true as const,
                  url: proxy,
                  width: null,
                  height: null,
                  premium: false as const,
                },
              ]
            : [],
      };
    },
  };
}

export const GenericVideoProvider = makeGeneric(
  "video",
  "Video",
  "🎬",
  "video",
  "mp4",
  ["https://example.com/video.mp4", "Direct .mp4 / .webm / .mov / .m4v / .mkv links"],
  isVideoFileUrl,
  "This URL doesn't point to a supported video file (.mp4, .webm, .mov, .m4v)."
);

export const GenericImageProvider = makeGeneric(
  "image",
  "Image",
  "🖼",
  "image",
  "jpg",
  ["https://example.com/photo.jpg", "Direct .jpg / .png / .webp / .gif / .avif / .bmp links"],
  isImageFileUrl,
  "This URL doesn't point to a supported image file (.jpg, .png, .webp, .gif)."
);

export const GenericAudioProvider = makeGeneric(
  "audio",
  "Audio",
  "🎧",
  "audio",
  "mp3",
  ["https://example.com/song.mp3", "Direct .mp3 / .wav / .m4a / .ogg / .opus / .flac / .aac links"],
  isAudioFileUrl,
  "This URL doesn't point to a supported audio file (.mp3, .wav, .m4a, .ogg)."
);
