import type { PlatformId } from "@/lib/downloader/detect";

/** Media container kind for size guards. */
export type MediaKind = "video" | "image" | "audio" | "thumbnail";

/**
 * Universal downloader contract.
 *
 * URL → resolveUrl() → Platform Detection → Media Extraction
 * → Variant Builder (video + audio) → Download URL Resolver → UI
 */

export type ErrorCode =
  | "UNSUPPORTED_URL"
  | "PRIVATE_CONTENT"
  | "LOGIN_REQUIRED"
  | "MEDIA_DELETED"
  | "AGE_RESTRICTED"
  | "GEO_RESTRICTED"
  | "LINK_EXPIRED"
  | "EXTRACTION_FAILED"
  | "RATE_LIMITED"
  | "BOT_CHECK"
  | "NO_STREAM"
  | "NO_VARIANTS";

export interface DownloadVariant {
  type: "video";
  /** yt-dlp format_id (stream identity). */
  id: string;
  label: string;
  /** e.g. "360p", "720p" — always derived from real stream dimensions. */
  quality: string;
  downloadable: true;
  /** Resolved download URL (proxied/muxed, size-guarded). */
  url: string;
  width: number | null;
  height: number | null;
  /** Container, e.g. "mp4", "webm" (spec: format). */
  format: string;
  sizeBytes: number | null;
  /** Alias of sizeBytes (spec: filesize). */
  filesize: number | null;
  /** True when a rewarded ad must be watched first. */
  premium: boolean;
  /** "muxed" = server-merged video+audio; "direct" = single file. */
  source: "muxed" | "direct";
  note?: string;
}

export interface AudioVariant {
  type: "audio";
  /** yt-dlp format_id (stream identity). */
  id: string;
  label: string;
  /** e.g. "64kbps", "128kbps", "320kbps". */
  quality: string;
  /** Real container, e.g. "m4a", "weba", "mp3", "opus". */
  format: string;
  /** abr in kbps when known (spec: bitrate). */
  bitrate: number | null;
  downloadable: true;
  url: string;
  sizeBytes: number | null;
  filesize: number | null;
  /** True when a rewarded ad must be watched first. */
  premium: boolean;
  note?: string;
}

export interface ImageVariant {
  type: "image";
  label: string;
  downloadable: true;
  url: string;
  width: number | null;
  height: number | null;
  premium: false;
}

export type ExtractionResult =
  | {
      success: true;
      platform: PlatformId | "generic";
      title: string;
      thumbnail: string | null;
      author: string | null;
      /** Seconds, null when unknown (e.g. direct files). Spec alias: duration. */
      durationSec: number | null;
      duration: number | null;
      sourceUrl: string;
      resolvedUrl: string;
      canonicalUrl: string;
      extractor: string;
      variants: DownloadVariant[];
      audioVariants: AudioVariant[];
      /** Photo/gallery assets actually present (thumbnails, covers). */
      images: ImageVariant[];
      notices: string[];
      logId?: number | null;
      /** Dev-only pipeline trace (omitted in production). */
      debug?: DebugInfo | null;
    }
  | {
      success: false;
      platform: PlatformId | "generic" | "unknown";
      code: ErrorCode;
      error: string;
    };

export interface PlatformDef {
  id: string;
  platform: PlatformId | "generic";
  displayName: string;
  icon: string;
  canHandle(url: string): boolean;
  supportedPatterns: string[];
  /** Shown when the pasted URL belongs to another platform. */
  invalidMessage: string;
  /** Full pipeline: normalize → resolve → extract → variants. */
  resolve(url: string): Promise<ExtractionResult>;
  /** Stage 1: normalize + canonicalize the input URL. */
  normalize?(url: string): Promise<NormalizeResult>;
  /** Stage 2: raw media extraction (metadata + streams). */
  extract?(url: string): Promise<ExtractResult>;
  /** Stage 3: metadata projection. */
  getMetadata?(info: ExtractResult): MediaMetadata;
  /** Stage 4: variant building from streams. */
  getVariants?(title: string, info: ExtractResult): BuiltVariants;
}

export interface NormalizeResult {
  ok: boolean;
  originalUrl: string;
  canonicalUrl: string;
  error?: string;
}

export interface MediaStream {
  id: string;
  url: string;
  ext: string;
  width: number | null;
  height: number | null;
  abr: number | null;
  filesize: number | null;
  videoOnly: boolean;
  audioOnly: boolean;
  combined: boolean;
}

export interface MediaMetadata {
  title: string;
  author: string | null;
  thumbnail: string | null;
  durationSec: number | null;
}

export interface ExtractResult {
  ok: boolean;
  metadata: MediaMetadata;
  videoStreams: MediaStream[];
  audioStreams: MediaStream[];
  error?: string;
  code?: ErrorCode;
}

export interface BuiltVariants {
  video: DownloadVariant[];
  audio: AudioVariant[];
}

export interface DebugInfo {
  platform: string;
  originalUrl: string;
  resolvedUrl: string;
  canonicalUrl: string;
  extractor: string;
  metadata: "SUCCESS" | "FAILED";
  videoStreams: number;
  audioStreams: number;
  variants: number;
  audioVariants: number;
  error: string | null;
}

/** Include debug trace only outside production. */
export function debugEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEBUG_DOWNLOADER === "true"
  );
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNSUPPORTED_URL: "Unsupported URL. This link doesn't match a supported platform or file.",
  PRIVATE_CONTENT: "Media Private. This media is private and cannot be accessed.",
  LOGIN_REQUIRED: "Login Required. This media requires login and cannot be processed.",
  MEDIA_DELETED: "Media Deleted. This media was deleted or is no longer available.",
  AGE_RESTRICTED: "Age Restricted Content. This media is age-restricted and cannot be processed.",
  GEO_RESTRICTED: "Geo Restricted Content. This media is not available in this region.",
  LINK_EXPIRED: "Download Link Expired. The download link has expired — please resolve the URL again.",
  EXTRACTION_FAILED: "Extraction Failed. The media could not be extracted. Please try again later.",
  RATE_LIMITED: "Rate Limited. Too many requests — please wait a moment and try again.",
  BOT_CHECK: "Bot Check Required. The platform asked for human verification — please try again later.",
  NO_STREAM: "No Media Stream Found. No downloadable video or audio stream was found in this link.",
  NO_VARIANTS: "No downloadable file is available for this link with the current method.",
};

export type LogStage =
  | "detect"
  | "resolve"
  | "extractor"
  | "extract-ok"
  | "extract-fail"
  | "variants"
  | "reward"
  | "download";

/** Structured server log for every pipeline step. */
export function dlog(stage: LogStage, message: string, extra?: unknown): void {
  const tag =
    stage === "detect"
      ? "platform detected"
      : stage === "resolve"
        ? "url resolved"
        : stage === "extractor"
          ? "extractor selected"
          : stage === "extract-ok"
            ? "extraction success"
            : stage === "extract-fail"
              ? "extraction failed"
              : stage === "reward"
                ? "reward event"
                : stage === "download"
                  ? "download started"
                  : "generated variants";
  if (extra === undefined) {
    console.log(`[singkat:${stage}] ${tag}: ${message}`);
  } else {
    console.log(`[singkat:${stage}] ${tag}: ${message}`, extra);
  }
}

/** HTTP status for each error code. */
export function statusOf(code: ErrorCode): number {
  switch (code) {
    case "UNSUPPORTED_URL":
      return 400;
    case "LINK_EXPIRED":
      return 410;
    case "RATE_LIMITED":
      return 429;
    default:
      return 422;
  }
}
