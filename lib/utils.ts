export function parseUserAgent(ua: string | null): {
  device: string;
  browser: string;
} {
  const s = (ua ?? "").toLowerCase();
  let device = "desktop";
  if (/mobile|iphone|android/.test(s)) device = "mobile";
  else if (/tablet|ipad/.test(s)) device = "tablet";
  else if (!s) device = "unknown";

  let browser = "other";
  if (/edg\//.test(s)) browser = "edge";
  else if (/chrome\//.test(s) && !/chromium/.test(s)) browser = "chrome";
  else if (/firefox\//.test(s)) browser = "firefox";
  else if (/safari\//.test(s) && /version\//.test(s)) browser = "safari";
  else if (/opr\/|opera/.test(s)) browser = "opera";
  else if (/bot|crawl|spider|slurp|mediapartners|facebookexternalhit|twitterbot|tiktok|embed/.test(s))
    browser = "bot";
  return { device, browser };
}

export const EXPIRY_OPTIONS = [
  { value: "none", label: "Tidak kedaluwarsa" },
  { value: "1d", label: "1 hari" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "90d", label: "90 hari" },
] as const;

export function expiryToDate(value: string | undefined): Date | null {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  switch (value) {
    case "1d":
      return new Date(now + day);
    case "7d":
      return new Date(now + 7 * day);
    case "30d":
      return new Date(now + 30 * day);
    case "90d":
      return new Date(now + 90 * day);
    default:
      return null;
  }
}
