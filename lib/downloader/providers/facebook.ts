import { validateDestinationUrl } from "@/lib/url-security";
import type {
  ExtractionResult,
  NormalizeResult,
  PlatformDef,
} from "@/lib/downloader/pipeline";
import { extractWithYtDlp } from "@/lib/downloader/extractors/ytdlp";
import { resolveUrl } from "@/lib/downloader/resolve-url";

const HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "fb.watch",
]);

export function isFacebookUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!HOSTS.has(u.hostname.toLowerCase())) return false;
    if (u.hostname === "fb.watch") return u.pathname.length > 1;
    const p = u.pathname.toLowerCase();
    return (
      p.includes("/watch") ||
      p.includes("/reel") ||
      p.includes("/video") ||
      p.includes("/share/") ||
      p.includes("/posts/") ||
      p.includes("story.php")
    );
  } catch {
    return false;
  }
}

export type FacebookKind =
  | "reel"
  | "watch"
  | "video"
  | "share"
  | "post"
  | "story"
  | "short"
  | "other";

function classify(pathname: string, hostname: string): FacebookKind {
  if (hostname === "fb.watch") return "short";
  const p = pathname.toLowerCase();
  if (p.includes("/reel")) return "reel";
  if (p.includes("/watch")) return "watch";
  if (p.includes("/share/")) return "share";
  if (p.includes("/posts/")) return "post";
  if (p.includes("story.php")) return "story";
  if (p.includes("/video")) return "video";
  return "other";
}

function numericId(pathname: string): string | null {
  const m = pathname.match(/\/(\d{8,})\/?$/);
  return m ? m[1] : null;
}

/**
 * normalizeFacebookUrl() — pure. Maps every supported Facebook shape to
 * a canonical watch/reel URL when the video ID is visible; share tokens
 * and fb.watch links are flagged for resolveRedirect().
 */
export function normalizeFacebookUrl(raw: string): NormalizeResult & { kind: FacebookKind } {
  const originalUrl = raw.trim();
  let u: URL;
  try {
    u = new URL(originalUrl);
  } catch {
    return { ok: false, originalUrl, canonicalUrl: originalUrl, kind: "other", error: "URL tidak valid." };
  }
  const kind = classify(u.pathname, u.hostname.toLowerCase());

  // Direct numeric IDs → canonical immediately.
  const v = u.searchParams.get("v");
  if (v && /^\d{8,}$/.test(v)) {
    return { ok: true, originalUrl, canonicalUrl: `https://www.facebook.com/watch/?v=${v}`, kind };
  }
  const id = numericId(u.pathname);
  if (id && (kind === "reel" || kind === "watch" || kind === "video" || kind === "post")) {
    return {
      ok: true,
      originalUrl,
      canonicalUrl:
        kind === "reel"
          ? `https://www.facebook.com/reel/${id}`
          : `https://www.facebook.com/watch/?v=${id}`,
      kind,
    };
  }
  if (kind === "story") {
    const fbid = u.searchParams.get("story_fbid");
    if (fbid && /^\d{8,}$/.test(fbid)) {
      return { ok: true, originalUrl, canonicalUrl: `https://www.facebook.com/watch/?v=${fbid}`, kind };
    }
  }
  // Share tokens / fb.watch need a redirect round-trip (needsResolve).
  if (kind === "share" || kind === "short") {
    return { ok: true, originalUrl, canonicalUrl: originalUrl, kind };
  }
  return { ok: true, originalUrl, canonicalUrl: originalUrl, kind };
}

/**
 * Share/short links carry no numeric ID — resolve to canonical via redirect.
 * The redirect target is accepted ONLY when it normalizes to a recognized
 * video/reel/watch URL with a numeric ID. Login/checkpoint pages and
 * unrecognized shapes fall back to the original (yt-dlp handles /share/
 * and fb.watch directly) — never feed a login page to the extractor.
 */
export async function resolveFacebookRedirect(normalized: string): Promise<string> {
  const r = await resolveUrl(normalized, { forceExpand: true });
  if (!r.ok) return normalized;
  const again = normalizeFacebookUrl(r.finalUrl);
  if (!again.ok) return normalized;
  const low = r.finalUrl.toLowerCase();
  if (low.includes("/login") || low.includes("/checkpoint")) return normalized;
  if (again.kind !== "reel" && again.kind !== "watch" && again.kind !== "video") {
    return normalized;
  }
  if (!/\d{8,}/.test(again.canonicalUrl)) return normalized;
  if (again.canonicalUrl === normalized) return normalized;
  return again.canonicalUrl;
}

export const FacebookProvider: PlatformDef = {
  id: "facebook",
  platform: "facebook",
  displayName: "Facebook",
  icon: "📘",
  supportedPatterns: [
    "facebook.com/watch?v=…",
    "facebook.com/reel/…",
    "facebook.com/…/videos/…",
    "facebook.com/share/v/…",
    "facebook.com/share/r/…",
    "facebook.com/share/p/…",
    "facebook.com/…/posts/…",
    "facebook.com/story.php?story_fbid=…",
    "fb.watch/… (short link)",
    "m.facebook.com/…",
  ],
  canHandle: isFacebookUrl,
  invalidMessage: "This doesn't look like a supported Facebook URL.",
  async normalize(url: string): Promise<NormalizeResult> {
    return normalizeFacebookUrl(url);
  },
  async resolve(url: string): Promise<ExtractionResult> {
    const norm = normalizeFacebookUrl(url);
    if (!norm.ok) {
      return { success: false, platform: "facebook", code: "UNSUPPORTED_URL", error: norm.error ?? "URL tidak valid." };
    }
    let canonicalUrl = norm.canonicalUrl;
    // Share tokens hide the video ID — resolve the redirect first.
    if (norm.kind === "share" || norm.kind === "short") {
      const check = await validateDestinationUrl(canonicalUrl);
      if (!check.ok) {
        return { success: false, platform: "facebook", code: "UNSUPPORTED_URL", error: check.error };
      }
      canonicalUrl = await resolveFacebookRedirect(canonicalUrl);
    }
    const result = await extractWithYtDlp("facebook", canonicalUrl, {
      originalUrl: norm.originalUrl,
      canonicalUrl,
      skipResolve: true,
    });
    return result;
  },
};
