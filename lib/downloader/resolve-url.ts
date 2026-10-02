import { validateDestinationUrl } from "@/lib/url-security";
import { detectPlatform, type PlatformId } from "@/lib/downloader/detect";
import { dlog } from "@/lib/downloader/pipeline";

export const SHORT_HOSTS = new Set([
  "vm.tiktok.com",
  "vt.tiktok.com",
  "youtu.be",
  "fb.watch",
  "pin.it",
  "t.co",
]);

export type ResolvedUrl =
  | { ok: true; originalUrl: string; finalUrl: string; platform: PlatformId | "generic"; hops: string[] }
  | { ok: false; error: string };

function timeoutSignal(ms: number): { signal: AbortSignal; done: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Universal URL Resolver.
 * - Short hosts (vm.tiktok, youtu.be, fb.watch, pin.it, t.co, …) are
 *   expanded hop by hop. Expansion STOPS as soon as the host is no
 *   longer short — we never probe the destination host itself.
 * - HEAD first, GET (body cancelled) fallback when HEAD fails/is blocked.
 * - If the final probe fails but a canonical hop was already obtained,
 *   the canonical URL is returned instead of an error.
 * - Every hop is re-validated against SSRF rules.
 */
export async function resolveUrl(
  raw: string,
  opts: { maxRedirects?: number; timeoutMs?: number; forceExpand?: boolean } = {}
): Promise<ResolvedUrl> {
  const originalUrl = raw.trim();
  const maxRedirects = opts.maxRedirects ?? 5;
  const timeoutMs = opts.timeoutMs ?? 10000;

  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return { ok: false, error: "URL tidak valid." };
  }

  const needsExpansion =
    opts.forceExpand === true || SHORT_HOSTS.has(parsed.hostname.toLowerCase());
  if (!needsExpansion) {
    const check = await validateDestinationUrl(originalUrl);
    if (!check.ok) return { ok: false, error: check.error };
    const platform = detectPlatform(check.url);
    return {
      ok: true,
      originalUrl,
      finalUrl: check.url,
      platform: platform === "unknown" ? "generic" : platform,
      hops: [],
    };
  }

  const finish = (finalUrl: string, hops: string[]): ResolvedUrl => {
    const platform = detectPlatform(finalUrl);
    if (hops.length > 0) dlog("detect", `resolved ${originalUrl} -> ${finalUrl} (${platform})`);
    return {
      ok: true,
      originalUrl,
      finalUrl,
      platform: platform === "unknown" ? "generic" : platform,
      hops,
    };
  };

  const hops: string[] = [];
  let current = originalUrl;
  let lastGood: string | null = null;
  for (let i = 0; i < maxRedirects; i++) {
    const check = await validateDestinationUrl(current);
    if (!check.ok) return lastGood ? finish(lastGood, hops) : { ok: false, error: check.error };
    current = check.url;
    if (i > 0) lastGood = current;
    const { signal, done } = timeoutSignal(timeoutMs);
    try {
      const head = await fetch(current, {
        method: "HEAD",
        signal,
        redirect: "manual",
        headers: { Accept: "*/*" },
      });
      const loc = head.status >= 300 && head.status < 400 ? head.headers.get("location") : null;
      try {
        await head.body?.cancel();
      } catch {
        // ignore
      }
      if (loc) {
        const next = new URL(loc, current).toString();
        hops.push(next);
        current = next;
        // Stop expanding once we leave short-host territory.
        if (!SHORT_HOSTS.has(hostOf(next))) {
          const v = await validateDestinationUrl(next);
          done();
          if (!v.ok) return lastGood ? finish(lastGood, hops) : { ok: false, error: v.error };
          return finish(v.url, hops);
        }
        done();
        continue;
      }
      if (head.ok || head.status === 405 || head.status === 501) {
        // Not a redirect (or HEAD blocked but host alive) — canonical reached.
        done();
        return finish(current, hops);
      }
      // Odd HEAD status — try a body-cancelled GET before giving up.
      const got = await probeGet(current, signal);
      done();
      if (got.redirect) {
        const next = new URL(got.redirect, current).toString();
        hops.push(next);
        current = next;
        if (!SHORT_HOSTS.has(hostOf(next))) {
          const v = await validateDestinationUrl(next);
          if (!v.ok) return lastGood ? finish(lastGood, hops) : { ok: false, error: v.error };
          return finish(v.url, hops);
        }
        continue;
      }
      if (got.alive) return finish(current, hops);
      return lastGood ? finish(lastGood, hops) : { ok: false, error: "Short URL tidak dapat dibuka." };
    } catch {
      done();
      return lastGood ? finish(lastGood, hops) : { ok: false, error: "Short URL tidak dapat dibuka." };
    }
  }
  return lastGood ? finish(lastGood, hops) : { ok: false, error: "Terlalu banyak redirect." };
}

async function probeGet(
  url: string,
  signal: AbortSignal
): Promise<{ redirect?: string; alive?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
      redirect: "manual",
      headers: { Accept: "*/*", Range: "bytes=0-0" },
    });
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }
    if (loc) return { redirect: loc };
    if (res.ok) return { alive: true };
    return {};
  } catch {
    return {};
  }
}
