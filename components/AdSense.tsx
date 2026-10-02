"use client";

import { useEffect } from "react";
import { getConsent } from "@/components/CookieConsent";

const FALLBACK_CLIENT = "ca-pub-5613319962434210";

/**
 * Google AdSense loader, placed per
 * https://support.google.com/adsense/answer/9274634 (AdSense code between
 * <head> tags on every page). Loads ONLY after explicit cookie consent
 * ("accepted") to honor the site's consent system + Terms.
 *
 * Configure via NEXT_PUBLIC_ADSENSE_ID; falls back to the verified
 * account ID. Leave NEXT_PUBLIC_ADSENSE_ID empty to disable ads entirely
 * (component renders nothing and loads nothing).
 */
export function adsenseClientId(): string {
  return process.env.NEXT_PUBLIC_ADSENSE_ID ?? FALLBACK_CLIENT;
}

export default function AdSense() {
  const id = adsenseClientId();
  useEffect(() => {
    if (!id) return;
    const inject = () => {
      if (getConsent() !== "accepted") return;
      if (document.querySelector('script[data-singkt-adsense="1"]')) return;
      const s = document.createElement("script");
      s.dataset.singktAdsense = "1";
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${id}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    };
    inject();
    window.addEventListener("singkat-consent", inject);
    return () => window.removeEventListener("singkat-consent", inject);
  }, [id]);
  return null;
}
