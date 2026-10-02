"use client";

import { useEffect } from "react";
import { getConsent } from "@/lib/consent";

/**
 * Analytics only ever loads AFTER explicit consent ("accepted").
 * Declining (or never choosing) means zero analytics requests.
 */
export default function ConsentAnalytics() {
  const gid = process.env.NEXT_PUBLIC_GA_ID ?? "";
  useEffect(() => {
    if (!gid) return;
    const apply = () => {
      if (getConsent() === "accepted") {
        const s = document.createElement("script");
        s.src = `https://www.googletagmanager.com/gtag/js?id=${gid}`;
        s.async = true;
        document.head.appendChild(s);
        const init = document.createElement("script");
        init.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gid}');`;
        document.head.appendChild(init);
      }
    };
    apply();
    const onConsent = () => apply();
    window.addEventListener("singkat-consent", onConsent);
    return () => window.removeEventListener("singkat-consent", onConsent);
  }, [gid]);
  return null;
}
