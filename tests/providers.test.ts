import { describe, expect, it } from "vitest";
import { isTikTokUrl } from "../lib/downloader/providers/tiktok";
import { isFacebookUrl } from "../lib/downloader/providers/facebook";
import { isInstagramUrl } from "../lib/downloader/providers/instagram";
import { isTwitterUrl } from "../lib/downloader/providers/twitter";
import { isYouTubeUrl } from "../lib/downloader/providers/youtube";
import {
  GenericAudioProvider,
  GenericImageProvider,
  GenericVideoProvider,
} from "../lib/downloader/providers/generic";

describe("tiktok provider", () => {
  it("accepts TikTok shapes only", () => {
    expect(isTikTokUrl("https://www.tiktok.com/@user/video/123456")).toBe(true);
    expect(isTikTokUrl("https://vm.tiktok.com/abcXYZ/")).toBe(true);
    expect(isTikTokUrl("https://vt.tiktok.com/abcXYZ/")).toBe(true);
    expect(isTikTokUrl("https://www.tiktok.com/@user")).toBe(false); // profile, no video
    expect(isTikTokUrl("https://www.facebook.com/watch/123")).toBe(false);
    expect(isTikTokUrl("javascript:alert(1)")).toBe(false);
    expect(isTikTokUrl("not a url")).toBe(false);
  });
});

describe("facebook provider", () => {
  it("accepts Facebook video shapes only", () => {
    expect(isFacebookUrl("https://www.facebook.com/watch/?v=123")).toBe(true);
    expect(isFacebookUrl("https://www.facebook.com/reel/123")).toBe(true);
    expect(isFacebookUrl("https://fb.watch/abc123/")).toBe(true);
    expect(isFacebookUrl("https://www.facebook.com/somepage/")).toBe(false);
    expect(isFacebookUrl("https://www.tiktok.com/@u/video/1")).toBe(false);
  });
});

describe("instagram provider", () => {
  it("accepts post/reel/tv shapes only", () => {
    expect(isInstagramUrl("https://www.instagram.com/p/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/reel/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/reels/ABC123/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/username/")).toBe(false);
    expect(isInstagramUrl("https://www.facebook.com/reel/123")).toBe(false);
  });
});

describe("twitter provider", () => {
  it("accepts status URLs on x/twitter only", () => {
    expect(isTwitterUrl("https://x.com/user/status/123")).toBe(true);
    expect(isTwitterUrl("https://twitter.com/user/status/123")).toBe(true);
    expect(isTwitterUrl("https://x.com/user")).toBe(false);
    expect(isTwitterUrl("https://www.instagram.com/p/ABC/")).toBe(false);
  });
});

describe("youtube provider", () => {
  it("accepts watch/shorts/share shapes only", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/shorts/abc")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/abc")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/playlist?list=x")).toBe(false);
    expect(isYouTubeUrl("https://www.tiktok.com/@u/video/1")).toBe(false);
  });
});

describe("generic providers", () => {
  it("video: direct extensions only", () => {
    expect(GenericVideoProvider.canHandle("https://example.com/a.mp4")).toBe(true);
    expect(GenericVideoProvider.canHandle("https://example.com/a.webm")).toBe(true);
    expect(GenericVideoProvider.canHandle("https://example.com/a.mp3")).toBe(false);
    expect(GenericVideoProvider.canHandle("https://example.com/page")).toBe(false);
    expect(GenericVideoProvider.canHandle("https://www.youtube.com/watch?v=x")).toBe(false);
  });
  it("image: direct extensions only", () => {
    expect(GenericImageProvider.canHandle("https://example.com/a.jpg")).toBe(true);
    expect(GenericImageProvider.canHandle("https://example.com/a.webp")).toBe(true);
    expect(GenericImageProvider.canHandle("https://example.com/a.mp4")).toBe(false);
  });
  it("audio: direct extensions only", () => {
    expect(GenericAudioProvider.canHandle("https://example.com/a.mp3")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.ogg")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.mp4")).toBe(false);
  });
});

describe("cross-platform isolation", () => {
  it("a TikTok URL is not handled by other platform providers", async () => {
    const u = "https://www.tiktok.com/@user/video/123";
    expect(isFacebookUrl(u)).toBe(false);
    expect(isInstagramUrl(u)).toBe(false);
    expect(isTwitterUrl(u)).toBe(false);
    expect(isYouTubeUrl(u)).toBe(false);
    expect(GenericVideoProvider.canHandle(u)).toBe(false);
  });
});

describe("extended url shapes", () => {
  it("instagram user-scoped, share, mirror hosts", () => {
    expect(isInstagramUrl("https://www.instagram.com/userx/reel/ABC/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/userx/p/ABC/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/share/ABC/")).toBe(true);
    expect(isInstagramUrl("https://m.instagram.com/p/ABC/")).toBe(true);
    expect(isInstagramUrl("https://instagr.am/p/ABC/")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/userx/")).toBe(false);
  });
  it("youtube live and legacy v links", () => {
    expect(isYouTubeUrl("https://www.youtube.com/live/abc123XYZ_-")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/v/abc123XYZ_-")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/playlist?list=x")).toBe(false);
  });
  it("tiktok photo and embed", () => {
    expect(isTikTokUrl("https://www.tiktok.com/@u/photo/123")).toBe(true);
    expect(isTikTokUrl("https://www.tiktok.com/embed/123")).toBe(true);
  });
  it("facebook web host", () => {
    expect(isFacebookUrl("https://web.facebook.com/watch/?v=123456789012345")).toBe(true);
  });
  it("generic extended containers", () => {
    expect(GenericVideoProvider.canHandle("https://example.com/a.mkv")).toBe(true);
    expect(GenericImageProvider.canHandle("https://example.com/a.avif")).toBe(true);
    expect(GenericImageProvider.canHandle("https://example.com/a.bmp")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.flac")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.opus")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.weba")).toBe(true);
    expect(GenericAudioProvider.canHandle("https://example.com/a.aac")).toBe(true);
  });
});
