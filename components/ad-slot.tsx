"use client";

import { useEffect, useState } from "react";
import { getConsent } from "@/lib/consent";
import { adsenseClientId } from "@/components/AdSense";

export type AdPlacement = "top" | "left-rail" | "right-rail" | "between-content";

/**
 * AdSense-ready slot. Renders NOTHING until ads are actually available
 * (client ID configured + cookie consent accepted), so the layout never
 * shows a giant empty "ad space" — rails collapse via grid `:has()`.
 */
export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!adsenseClientId()) return;
    const sync = () => setReady(getConsent() === "accepted");
    sync();
    window.addEventListener("singkat-consent", sync);
    return () => window.removeEventListener("singkat-consent", sync);
  }, []);

  if (!ready) return null;
  if (placement === "left-rail" || placement === "right-rail") {
    return (
      <aside
        className={`rail rail-${placement === "left-rail" ? "left" : "right"}`}
        data-placement={placement}
        aria-label="Advertisement"
      >
        <div className="ad-box" />
      </aside>
    );
  }
  return <div className="ad-leaderboard" data-placement={placement} aria-label="Advertisement" />;
}
