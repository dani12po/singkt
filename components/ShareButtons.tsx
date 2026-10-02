"use client";

import { useState } from "react";
import { shareLinks, SOCIAL_TAGS } from "@/lib/social";

export default function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const links = shareLinks(title, url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="row">
        <a className="btn secondary" href={links.facebook} target="_blank" rel="noopener noreferrer">
          Facebook
        </a>
        <a className="btn secondary" href={links.x} target="_blank" rel="noopener noreferrer">
          X
        </a>
        <a className="btn secondary" href={links.telegram} target="_blank" rel="noopener noreferrer">
          Telegram
        </a>
        <a className="btn secondary" href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <button className="btn secondary" type="button" onClick={copy}>
          {copied ? "✓ Tersalin" : "Copy Link"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        {SOCIAL_TAGS.join(" ")}
      </p>
    </div>
  );
}
