import { describe, expect, it, vi, afterEach } from "vitest";
import { detectPlatform, PLATFORM_META } from "../lib/downloader/detect";
import {
  buildImages,
  buildMedia,
  buildVariants,
  mapYtDlpError,
  muxContainer,
  normQuality,
  splitExtraArgs,
  THUMB_FALLBACK_CODES,
} from "../lib/downloader/extractors/ytdlp";
import { pickProvider } from "../lib/downloader/universal";
import { normalizeFacebookUrl } from "../lib/downloader/providers/facebook";
import { isFacebookUrl } from "../lib/downloader/providers/facebook";
import {
  completeRewardSession,
  createTicket,
  isPremiumAudio,
  isPremiumVideo,
  issueUnlockToken,
  startRewardSession,
  verifyTicket,
  verifyUnlockToken,
} from "../lib/downloader/reward";
import { resolveUrl, SHORT_HOSTS } from "../lib/downloader/resolve-url";
import { ERROR_MESSAGES, type ErrorCode } from "../lib/downloader/pipeline";
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
} from "../lib/downloader/providers";
import { isPinterestUrl } from "../lib/downloader/providers/pinterest";

describe("platform detection", () => {
  it("detects all supported platforms", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=x")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/x")).toBe("youtube");
    expect(detectPlatform("https://www.tiktok.com/@u/video/1")).toBe("tiktok");
    expect(detectPlatform("https://vm.tiktok.com/abc/")).toBe("tiktok");
    expect(detectPlatform("https://www.instagram.com/p/ABC/")).toBe("instagram");
    expect(detectPlatform("https://www.facebook.com/watch/?v=1")).toBe("facebook");
    expect(detectPlatform("https://fb.watch/abc/")).toBe("facebook");
    expect(detectPlatform("https://m.facebook.com/watch/?v=1")).toBe("facebook");
    expect(detectPlatform("https://x.com/u/status/1")).toBe("twitter");
    expect(detectPlatform("https://twitter.com/u/status/1")).toBe("twitter");
    expect(detectPlatform("https://vimeo.com/123456")).toBe("vimeo");
    expect(detectPlatform("https://player.vimeo.com/video/123")).toBe("vimeo");
    expect(detectPlatform("https://www.pinterest.com/pin/123/")).toBe("pinterest");
    expect(detectPlatform("https://pin.it/abc")).toBe("pinterest");
  });

  it("falls back to generic, rejects malformed", () => {
    expect(detectPlatform("https://example.com/video.mp4")).toBe("generic");
    expect(detectPlatform("not a url")).toBe("unknown");
    expect(detectPlatform("javascript:alert(1)")).toBe("unknown");
    expect(detectPlatform("ftp://example.com/x")).toBe("unknown");
  });

  it("has meta for every platform", () => {
    for (const p of ["youtube", "tiktok", "instagram", "facebook", "twitter", "vimeo", "pinterest"] as const) {
      expect(PLATFORM_META[p].name.length).toBeGreaterThan(0);
      expect(PLATFORM_META[p].icon.length).toBeGreaterThan(0);
    }
  });

  it("short hosts are expanded by the universal resolver", () => {
    for (const h of ["vm.tiktok.com", "vt.tiktok.com", "youtu.be", "fb.watch", "pin.it", "t.co"]) {
      expect(SHORT_HOSTS.has(h)).toBe(true);
    }
  });
});

describe("pinterest provider", () => {
  it("accepts pin + short shapes only", () => {
    expect(isPinterestUrl("https://www.pinterest.com/pin/123456/")).toBe(true);
    expect(isPinterestUrl("https://pin.it/abc123")).toBe(true);
    expect(isPinterestUrl("https://www.pinterest.com/user/")).toBe(false);
    expect(isPinterestUrl("https://www.instagram.com/p/ABC/")).toBe(false);
  });
});

describe("yt-dlp error mapping", () => {
  it("maps to structured codes", () => {
    expect(mapYtDlpError("ERROR: Private video")).toBe("PRIVATE_CONTENT");
    expect(mapYtDlpError("ERROR: Please log in to access")).toBe("LOGIN_REQUIRED");
    expect(mapYtDlpError("ERROR: This video has been removed")).toBe("MEDIA_DELETED");
    expect(mapYtDlpError("ERROR: HTTP Error 429: Too Many Requests")).toBe("RATE_LIMITED");
    expect(mapYtDlpError("ERROR: Sign in to confirm your age")).toBe("AGE_RESTRICTED");
    expect(mapYtDlpError("ERROR: This video is not available in your country")).toBe("GEO_RESTRICTED");
    expect(mapYtDlpError("ERROR: [TikTok] 123: Your IP address is blocked from accessing this post")).toBe("GEO_RESTRICTED");
    expect(mapYtDlpError("ERROR: Unsupported URL")).toBe("UNSUPPORTED_URL");
    expect(mapYtDlpError("ERROR: unable to download: HTTP Error 403")).toBe("LINK_EXPIRED");
    expect(mapYtDlpError("ERROR: unable to download webpage: SSL certificate verify failed")).toBe("EXTRACTION_FAILED");
    // IDs/URLs containing bare numbers must not misclassify:
    expect(mapYtDlpError("ERROR: [youtube] abc404xyz: some failure")).toBe("EXTRACTION_FAILED");
    expect(mapYtDlpError("ERROR: [youtube] xyz: HTTP Error 404")).toBe("MEDIA_DELETED");
    expect(mapYtDlpError("ERROR: Requested format is not available")).toBe("EXTRACTION_FAILED");
    expect(mapYtDlpError("ERROR: No video formats found")).toBe("NO_STREAM");
  });

  it("every code has a user message", () => {
    const codes: ErrorCode[] = [
      "UNSUPPORTED_URL",
      "PRIVATE_CONTENT",
      "LOGIN_REQUIRED",
      "MEDIA_DELETED",
      "AGE_RESTRICTED",
      "GEO_RESTRICTED",
      "LINK_EXPIRED",
      "EXTRACTION_FAILED",
      "RATE_LIMITED",
      "BOT_CHECK",
      "NO_STREAM",
      "NO_VARIANTS",
    ];
    for (const c of codes) expect(ERROR_MESSAGES[c].length).toBeGreaterThan(10);
  });
});

const FIXTURE_FORMATS = [
  { url: "https://cdn.example/1080.mp4", ext: "mp4", vcodec: "avc1", acodec: "mp4a", height: 1080, tbr: 5000, filesize: 10000000 },
  { url: "https://cdn.example/720.mp4", ext: "mp4", vcodec: "avc1", acodec: "mp4a", height: 720, tbr: 2500, filesize_approx: 5000000 },
  { url: "https://cdn.example/720b.mp4", ext: "mp4", vcodec: "avc1", acodec: "mp4a", height: 720, tbr: 2000 },
  { url: "https://cdn.example/drm.mp4", ext: "mp4", vcodec: "avc1", acodec: "mp4a", height: 480, has_drm: true },
  { url: "https://cdn.example/audio.m4a", ext: "m4a", vcodec: "none", acodec: "mp4a", abr: 128 },
  { url: "https://cdn.example/audiohi.webm", ext: "webm", vcodec: "none", acodec: "opus", abr: 320 },
  { url: "https://cdn.example/noaudio.webm", ext: "webm", vcodec: "vp9", acodec: "none", height: 480 },
  { url: "https://cdn.example/hls.m3u8", ext: "mp4", protocol: "m3u8_native", vcodec: "avc1", acodec: "mp4a", height: 1440 },
  { url: undefined, ext: "mp4", vcodec: "avc1", acodec: "mp4a", height: 360 },
];

describe("variant builder (video + audio split)", () => {
  it("splits video and audio with premium flags", () => {
    const { video, audio } = buildMedia("Test Video", FIXTURE_FORMATS);
    expect(video.length).toBeGreaterThan(0);
    expect(audio.length).toBeGreaterThan(0);
    for (const x of [...video, ...audio]) {
      expect(x.downloadable).toBe(true);
      expect(x.url.startsWith("/api/media/")).toBe(true);
      expect(x.id.length).toBeGreaterThan(0);
    }
    // Ascending: 480p muxed added (DASH alongside combined), 720p deduped,
    // DRM + url-less excluded
    expect(video.map((v) => v.quality)).toEqual(["480p", "720p", "1080p"]);
    expect(video[0].source).toBe("muxed");
    expect(video[0].url).toContain("/api/media/mux?t=");
    expect(video.some((x) => x.label.includes("480p"))).toBe(true);
    expect(video[2].sizeBytes).toBe(10000000);
    // Premium: 720p+ video, >128k audio. Free: 128k audio.
    expect(video[0].premium).toBe(false);
    expect(video[1].premium).toBe(true);
    expect(video[2].source).toBe("direct");
    // HLS manifests are never offered as downloadable files:
    expect(video.some((x) => x.quality === "1440p")).toBe(false);
    const a128 = audio.find((a) => a.quality === "128kbps");
    const a320 = audio.find((a) => a.quality === "320kbps");
    expect(a128?.premium).toBe(false);
    expect(a320?.premium).toBe(true);
    expect(a128?.url).toContain("/api/media/dl?t=");
  });

  it("muxes separated streams instead of shipping silent video", () => {
    const { video, audio } = buildMedia("Dash Video", [
      { url: "https://cdn.example/vp9.webm", ext: "webm", vcodec: "vp9", acodec: "none", height: 1080, format_id: "v" },
      { url: "https://cdn.example/a.m4a", ext: "m4a", vcodec: "none", acodec: "mp4a", abr: 128, format_id: "a" },
    ]);
    expect(video.some((x) => x.quality === "1080p" && x.source === "muxed")).toBe(true);
    expect(video.some((x) => x.note === "No audio track")).toBe(false);
    expect(video[0].url).toContain("/api/media/mux?t=");
    expect(audio.some((x) => x.quality === "128kbps")).toBe(true);
  });

  it("returns empty when nothing usable", () => {
    const r = buildMedia("x", [
      { url: "https://cdn.example/drm.mp4", ext: "mp4", vcodec: "avc1", acodec: "mp4a", has_drm: true },
    ]);
    expect(r.video).toHaveLength(0);
    expect(r.audio).toHaveLength(0);
    expect(buildVariants("x", [])).toHaveLength(0);
  });
});

describe("signed tickets + reward sessions", () => {
  it("refuses dev secrets in production", () => {
    const OLD_ENV = { ...process.env };
    const restore = (k: string) => {
      if (OLD_ENV[k] === undefined) delete process.env[k];
      else process.env[k] = OLD_ENV[k];
    };
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.REWARD_SECRET;
    process.env.ADMIN_TOKEN = "dev-admin-token-change-in-production";
    expect(() => createTicket({ u: "https://cdn.example/v.mp4", kind: "video", fn: "v.mp4", premium: false })).toThrow(
      /REWARD_SECRET/
    );
    vi.unstubAllEnvs();
    restore("ADMIN_TOKEN");
    restore("REWARD_SECRET");
  });
  it("mints verifiable, expiring, tamper-proof tickets", () => {
    const { ticket } = createTicket({
      u: "https://cdn.example/v.mp4",
      kind: "video",
      fn: "v.mp4",
      premium: true,
    });
    const p = verifyTicket(ticket);
    expect(p?.u).toBe("https://cdn.example/v.mp4");
    expect(p?.premium).toBe(true);
    // Tampered payload / signature / garbage all rejected:
    expect(verifyTicket(ticket.slice(0, -2) + "xx")).toBeNull();
    expect(verifyTicket("garbage")).toBeNull();
    expect(verifyTicket(`${ticket}.extra`)).toBeNull();
  });

  it("premium strip is useless: unlock binds to the ticket, not the flag", () => {
    const { ticket } = createTicket({
      u: "https://cdn.example/v.mp4",
      kind: "video",
      fn: "v.mp4",
      premium: true,
    });
    const body = ticket.split(".")[0];
    // Attacker drops premium client-side — but there is no client flag
    // anymore; the ticket itself says premium.
    expect(verifyTicket(ticket)?.premium).toBe(true);
    const { token, exp } = issueUnlockToken(body);
    expect(verifyUnlockToken(body, token, exp)).toBe(true);
    expect(verifyUnlockToken(body + "x", token, exp)).toBe(false);
    expect(verifyUnlockToken(body, token, Math.floor(Date.now() / 1000) - 10)).toBe(false);
  });

  it("reward sessions enforce server-measured watch time", () => {
    const { ticket } = createTicket({
      u: "https://cdn.example/v.mp4",
      kind: "video",
      fn: "v.mp4",
      premium: true,
    });
    // Free tickets never need a session:
    const { ticket: free } = createTicket({
      u: "https://cdn.example/a.mp3",
      kind: "audio",
      fn: "a.mp3",
      premium: false,
    });
    expect("error" in startRewardSession(free, "128kbps", null)).toBe(true);
    // Forged tickets rejected:
    expect("error" in startRewardSession("forged.ticket", "720p", null)).toBe(true);
    const started = startRewardSession(ticket, "720p", 7);
    expect("sessionId" in started).toBe(true);
    if ("sessionId" in started) {
      // Immediate completion fails (ad not watched):
      expect("error" in completeRewardSession(started.sessionId)).toBe(true);
      // …and the session is consumed: second attempt reports it missing:
      const second = completeRewardSession(started.sessionId);
      expect("error" in second).toBe(true);
      if ("error" in second) expect(second.error).toMatch(/not found|expired/);
      // Unknown sessions fail:
      expect("error" in completeRewardSession("nope")).toBe(true);
    }
  });

  it("handles 3000+ char upstream urls without truncation", () => {
    const long = `https://cdn.example/v.mp4?${"x".repeat(3100)}`;
    const { ticket } = createTicket({ u: long, kind: "video", fn: "v.mp4", premium: true });
    expect(ticket.length).toBeGreaterThan(3000);
    expect(verifyTicket(ticket)?.u).toBe(long);
  });

  it("classifies free vs premium per spec", () => {
    expect(isPremiumVideo(360)).toBe(false);
    expect(isPremiumVideo(480)).toBe(false);
    expect(isPremiumVideo(720)).toBe(true);
    expect(isPremiumVideo(2160)).toBe(true);
    expect(isPremiumAudio(64)).toBe(false);
    expect(isPremiumAudio(128)).toBe(false);
    expect(isPremiumAudio(320)).toBe(true);
  });
});

describe("thumbnail fallback policy", () => {
  it("covers transient failures but never masks private/walled content", () => {
    for (const c of ["EXTRACTION_FAILED", "GEO_RESTRICTED", "LINK_EXPIRED", "NO_VARIANTS", "RATE_LIMITED"] as const) {
      expect(THUMB_FALLBACK_CODES).toContain(c);
    }
    for (const c of ["PRIVATE_CONTENT", "LOGIN_REQUIRED", "MEDIA_DELETED", "AGE_RESTRICTED", "UNSUPPORTED_URL"] as const) {
      expect(THUMB_FALLBACK_CODES).not.toContain(c);
    }
  });
});

describe("resolution detection (real dimensions only)", () => {
  it("uses the short side for portrait video", () => {
    expect(normQuality(720, 1280)).toBe(720);
    expect(normQuality(1280, 720)).toBe(720);
    expect(normQuality(1920, 1080)).toBe(1080);
    expect(normQuality(null, 480)).toBe(480);
    expect(normQuality(null, null)).toBeNull();
  });

  it("sorts video low to high and never invents qualities", () => {
    const { video } = buildMedia("Portrait", [
      { url: "https://cdn.example/720.mp4", ext: "mp4", vcodec: "avc1", acodec: "none", width: 720, height: 1280, format_id: "a" },
      { url: "https://cdn.example/360.mp4", ext: "mp4", vcodec: "avc1", acodec: "none", width: 360, height: 640, format_id: "b" },
      { url: "https://cdn.example/au.m4a", ext: "m4a", vcodec: "none", acodec: "mp4a", abr: 67, format_id: "c" },
    ]);
    expect(video.map((v) => v.quality)).toEqual(["360p", "720p"]);
    expect(video[1].width).toBe(720);
    expect(video[1].height).toBe(1280);
    expect(video[1].source).toBe("muxed");
    expect(video[1].url).toContain("/api/media/mux?t=");
  });
});

describe("facebook url normalization", () => {
  it("canonicalizes numeric watch/reel/post/story urls", () => {
    expect(normalizeFacebookUrl("https://www.facebook.com/reel/2568353086924730").canonicalUrl)
      .toBe("https://www.facebook.com/reel/2568353086924730");
    expect(normalizeFacebookUrl("https://m.facebook.com/watch/?v=123456789012345").canonicalUrl)
      .toBe("https://www.facebook.com/watch/?v=123456789012345");
    expect(normalizeFacebookUrl("https://www.facebook.com/user/posts/123456789012345").canonicalUrl)
      .toBe("https://www.facebook.com/watch/?v=123456789012345");
    expect(normalizeFacebookUrl("https://www.facebook.com/story.php?story_fbid=123456789012345&id=1").canonicalUrl)
      .toBe("https://www.facebook.com/watch/?v=123456789012345");
  });

  it("flags share tokens and fb.watch for redirect resolution", () => {
    expect(normalizeFacebookUrl("https://www.facebook.com/share/v/abcXYZ").kind).toBe("share");
    expect(normalizeFacebookUrl("https://www.facebook.com/share/r/abcXYZ").kind).toBe("share");
    expect(normalizeFacebookUrl("https://fb.watch/abc123/").kind).toBe("short");
  });

  it("accepts all required facebook shapes", () => {
    for (const u of [
      "https://www.facebook.com/watch?v=123456789012345",
      "https://www.facebook.com/reel/123456789012345",
      "https://www.facebook.com/u/videos/123456789012345",
      "https://www.facebook.com/share/v/abc",
      "https://www.facebook.com/share/r/abc",
      "https://www.facebook.com/share/p/abc",
      "https://www.facebook.com/u/posts/123456789012345",
      "https://www.facebook.com/story.php?story_fbid=123",
      "https://fb.watch/abc/",
      "https://m.facebook.com/watch/?v=123456789012345",
    ]) {
      expect(isFacebookUrl(u)).toBe(true);
    }
  });
});

describe("ticket payload integrity", () => {
  it("round-trips upstream identity through tickets", () => {
    const { ticket } = createTicket({
      v: "https://cdn.example/v.mp4",
      a: "https://cdn.example/a.m4a",
      kind: "video",
      fn: "out.mp4",
      premium: true,
    });
    const p = verifyTicket(ticket);
    expect(p?.v).toBe("https://cdn.example/v.mp4");
    expect(p?.a).toBe("https://cdn.example/a.m4a");
    expect(p?.kind).toBe("video");
  });
});

describe("youtube-like fixture (itag18 + DASH + full audio ladder)", () => {
  const F = (o: object) => ({ url: "https://cdn.example/x", ext: "mp4", ...o });
  const fmts = [
    F({ format_id: "18", vcodec: "avc1", acodec: "mp4a", width: 640, height: 360, ext: "mp4" }),
    ...[144, 240, 360, 480, 720, 1080, 1440, 2160].map((h, i) => ({
      url: `https://cdn.example/d${h}.mp4`,
      ext: "mp4",
      vcodec: "avc1",
      acodec: "none",
      width: Math.round((h * 16) / 9),
      height: h,
      format_id: `d${h}`,
      tbr: 1000 + i,
    })),
    ...[48, 64, 96, 128, 160, 256].map((abr) => ({
      url: `https://cdn.example/a${abr}.m4a`,
      ext: "m4a",
      vcodec: "none",
      acodec: "mp4a",
      abr,
      format_id: `a${abr}`,
    })),
  ];
  it("keeps top-6 incl 1080p+, best audio for mux", () => {
    const { video, audio } = buildMedia("YT", fmts);
    expect(video.map((v) => v.quality)).toEqual(["360p", "480p", "720p", "1080p", "1440p", "2160p"]);
    expect(video[0].source).toBe("direct");
    expect(video[5].source).toBe("muxed");
    expect(audio.map((a) => a.quality)).toEqual(["256kbps", "160kbps", "128kbps", "96kbps"]);
    expect(video[5].url).toContain("/api/media/mux?t=");
  });

  it("tiktok-like http mp4 passes through untouched", () => {
    const { video, audio } = buildMedia("TT", [
      { url: "https://cdn.example/v.mp4", ext: "mp4", protocol: "https", vcodec: "h264", acodec: "aac", width: 720, height: 1280, format_id: "h" },
    ]);
    expect(video.map((v) => v.quality)).toEqual(["720p"]);
    expect(video[0].source).toBe("direct");
    expect(audio).toHaveLength(0);
  });

  it("x-like http variants kept, HLS never a direct file", () => {
    const { video } = buildMedia("X", [
      { url: "https://cdn.example/v.mp4", ext: "mp4", protocol: "https", vcodec: "h264", acodec: "aac", width: 1280, height: 720, format_id: "h" },
      { url: "https://cdn.example/x.m3u8", ext: "mp4", protocol: "m3u8_native", vcodec: "h264", acodec: "aac", width: 1280, height: 720, format_id: "m" },
    ]);
    expect(video).toHaveLength(1);
    expect(video[0].url).not.toContain(".m3u8");
  });

  it("hls-only is offered as converted variant when mux allowed", () => {
    const fmts = [
      { url: "https://cdn.example/x.m3u8", ext: "mp4", protocol: "m3u8_native", vcodec: "h264", acodec: "aac", width: 1280, height: 720, format_id: "m" },
    ];
    const on = buildMedia("HLS", fmts);
    expect(on.video).toHaveLength(1);
    expect(on.video[0].source).toBe("muxed");
    expect(on.video[0].note).toMatch(/stream/i);
    expect(on.video[0].url).toContain("/api/media/mux?t=");
    const off = buildMedia("HLS", fmts, { mux: false });
    expect(off.video).toHaveLength(0);
    expect(off.audio).toHaveLength(0);
  });
});

describe("mux container mapping", () => {
  it("mp4 for h264+aac, webm for vp9+opus, mkv mixed", () => {
    expect(muxContainer("avc1", "mp4a.40.2")).toBe("mp4");
    expect(muxContainer("av01.0.05M.08", "mp4a.40.2")).toBe("mp4");
    expect(muxContainer("vp9", "opus")).toBe("webm");
    expect(muxContainer("avc1", "opus")).toBe("mkv");
    expect(muxContainer(undefined, undefined)).toBe("mkv");
  });
});

describe("bot-check + extra args", () => {
  it("maps bot challenges to BOT_CHECK", () => {
    expect(mapYtDlpError("ERROR: Sign in to confirm you're not a bot")).toBe("BOT_CHECK");
    expect(mapYtDlpError("ERROR: Detected unusual traffic, bot check")).toBe("BOT_CHECK");
  });
  it("splits extra args with quotes", () => {
    expect(splitExtraArgs('--js-runtimes node --extractor-args "youtube:player_client=ios"')).toEqual([
      "--js-runtimes",
      "node",
      "--extractor-args",
      "youtube:player_client=ios",
    ]);
    expect(splitExtraArgs(undefined)).toEqual([]);
  });
});

describe("universal resolver (mocked fetch)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
    vi.stubGlobal("fetch", ((url: unknown, init?: RequestInit) => {
      return Promise.resolve(handler(String(url), init));
    }) as typeof fetch);
  }

  function headResponse(status: number, location?: string): Response {
    const h = new Headers();
    if (location) h.set("location", location);
    return new Response(null, { status, headers: h });
  }

  it("expands short hosts and stops at the full host", async () => {
    let calls = 0;
    mockFetch((url, init) => {
      calls++;
      expect(init?.method ?? "GET").toBe("HEAD");
      if (url.startsWith("https://youtu.be/")) {
        return headResponse(302, "https://www.youtube.com/watch?v=abc123");
      }
      return headResponse(200);
    });
    const r = await resolveUrl("https://youtu.be/abc123");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.finalUrl).toContain("youtube.com/watch");
      expect(r.hops).toHaveLength(1);
    }
    // One HEAD for the short host; the destination host is never probed.
    expect(calls).toBe(1);
  });

  it("falls back to GET when HEAD fails, keeps canonical on final failure", async () => {
    mockFetch((url, init) => {
      if (url.startsWith("https://vm.tiktok.com/")) {
        return headResponse(302, "https://vm.tiktok.com/step2");
      }
      if (url.includes("step2")) {
        if ((init?.method ?? "GET") === "HEAD") return headResponse(500);
        return new Response(null, { status: 200 });
      }
      return headResponse(200);
    });
    const r = await resolveUrl("https://vm.tiktok.com/abc");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.finalUrl).toContain("step2");
  });
});

describe("universal provider routing", () => {
  it("routes each platform to its own provider", () => {
    expect(pickProvider("youtube", "https://www.youtube.com/watch?v=x")?.id).toBe("youtube");
    expect(pickProvider("tiktok", "https://www.tiktok.com/@u/video/1")?.id).toBe("tiktok");
    expect(pickProvider("facebook", "https://www.facebook.com/reel/1")?.id).toBe("facebook");
    expect(pickProvider("unknown", "https://example.com/")).toBeNull();
  });

  it("falls back to generic direct-file providers by extension", () => {
    expect(pickProvider("generic", "https://example.com/a.mp4")?.id).toBe("video");
    expect(pickProvider("generic", "https://example.com/a.jpg")?.id).toBe("image");
    expect(pickProvider("generic", "https://example.com/a.mp3")?.id).toBe("audio");
    expect(pickProvider("generic", "https://example.com/page")).toBeNull();
  });
});

describe("gallery builder", () => {
  it("dedupes, caps, and skips invalid thumbnail urls", () => {
    const imgs = buildImages("T", [
      { url: "https://cdn.example/a.jpg", width: 1280, height: 720 },
      { url: "https://cdn.example/a.jpg", width: 1280, height: 720 },
      { url: "not-a-url" },
      { url: "" },
      ...Array.from({ length: 10 }, (_, i) => ({ url: `https://cdn.example/${i}.jpg` })),
    ]);
    expect(imgs).toHaveLength(8);
    expect(imgs[0].label).toBe("Photo 1280×720");
    for (const im of imgs) {
      expect(im.downloadable).toBe(true);
      expect(im.url.startsWith("/api/media/")).toBe(true);
    }
  });

  it("returns empty for no thumbnails", () => {
    expect(buildImages("T", [])).toHaveLength(0);
  });
});

describe("provider registry", () => {
  it("every platform has a provider wired to an extractor", async () => {
    const defs = [TikTokProvider, FacebookProvider, InstagramProvider, TwitterProvider, YouTubeProvider, VimeoProvider, PinterestProvider];
    expect(defs).toHaveLength(7);
    for (const d of defs) {
      expect(typeof d.canHandle).toBe("function");
      expect(d.supportedPatterns.length).toBeGreaterThan(0);
      expect(d.invalidMessage.length).toBeGreaterThan(5);
      expect(typeof d.resolve).toBe("function");
    }
    // Generic adapters keep working with the new contract shape
    for (const g of [GenericVideoProvider, GenericImageProvider, GenericAudioProvider]) {
      expect(typeof g.resolve).toBe("function");
    }
  });
});
