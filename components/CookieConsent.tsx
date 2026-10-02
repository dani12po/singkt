"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n/dict";
import { getConsent, persistConsent } from "@/lib/consent";

export default function CookieConsent({ dict }: { dict: Dict }) {
  const [visible, setVisible] = useState(false);
  const c = dict.cookies;

  useEffect(() => {
    if (!getConsent()) setVisible(true);
  }, []);

  if (!visible) return null;
  return (
    <div className="cookie-banner" role="dialog" aria-label={c.title}>
      <div className="container cookie-inner">
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          <strong>{c.title}. </strong>
          {c.text} <a href="/privacy">{c.policy}</a>
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn accent"
            onClick={() => {
              persistConsent("accepted");
              setVisible(false);
            }}
          >
            {c.accept}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              persistConsent("declined");
              setVisible(false);
            }}
          >
            {c.decline}
          </button>
        </div>
      </div>
    </div>
  );
}
