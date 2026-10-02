/**
 * Cookie-consent helpers (tiny, no React) shared by the banner,
 * the AdSense loader, and the analytics loader.
 *
 * Kept separate from the banner component so the banner UI can be
 * lazy-loaded (next/dynamic, ssr:false) without pulling the whole
 * component — or vice versa — into the initial client bundle.
 */

export type ConsentValue = "accepted" | "declined";

const KEY = "singkat_cookie_consent";
export const CONSENT_EVENT = "singkat-consent";

export function getConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {
    // storage unavailable (SSR / private mode)
  }
  return null;
}

export function persistConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // ignore
  }
  document.cookie = `${KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
