"use client";

import { useEffect, useRef, useState } from "react";
import { getConsent } from "@/lib/consent";
import { adsenseClientId } from "@/components/AdSense";

export type AdPlacement = "top" | "between-content";

/**
 * AdSense unit that renders ONLY when an actual ad can serve:
 * client ID configured + cookie consent accepted + AdSense reports
 * the slot as filled. In every other case it returns null —
 * zero pixels, zero layout impact. No placeholders, no skeletons,
 * no reserved space, ever.
 */
export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const [eligible, setEligible] = useState(false);
  const [filled, setFilled] = useState(false);
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!adsenseClientId()) return;
    const sync = () => setEligible(getConsent() === "accepted");
    sync();
    window.addEventListener("singkat-consent", sync);
    return () => window.removeEventListener("singkat-consent", sync);
  }, []);

  useEffect(() => {
    if (!eligible) return;
    const w = window as unknown as { adsbygoogle?: unknown[] };
    try {
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
    } catch {
      setEligible(false);
      return;
    }
    const el = insRef.current;
    if (!el) return;
    const obs = new MutationObserver(() => {
      const st = el.getAttribute("data-ad-status");
      if (st === "filled") setFilled(true);
      else if (st === "unfilled") setEligible(false);
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    // AdSense never answered → vanish instead of holding space.
    const t = setTimeout(() => {
      if (!insRef.current?.getAttribute("data-ad-status")) setEligible(false);
    }, 5000);
    return () => {
      obs.disconnect();
      clearTimeout(t);
    };
  }, [eligible]);

  if (!eligible) return null;
  return (
    <div
      className="ad-unit"
      data-placement={placement}
      style={filled ? undefined : { display: "none" }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseClientId()}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
