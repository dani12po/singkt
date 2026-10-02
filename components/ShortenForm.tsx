"use client";

import { useState } from "react";
import PasteClearInput from "@/components/paste-clear-input";
import type { Dict } from "@/lib/i18n/dict";

type ShortenResult = {
  shortCode: string;
  shortUrl: string;
  expiresAt: string | null;
};

const EXPIRY_VALUES = ["none", "1d", "7d", "30d", "90d"] as const;

export default function ShortenForm({ dict }: { dict: Dict }) {
  const s = dict.shortlink;
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCopied(false);
    const v0 = url.trim();
    if (!v0) {
      setError(s.empty);
      return;
    }
    const v = /^https?:\/\//i.test(v0) ? v0 : `https://${v0}`;
    setLoading(true);
    try {
      const res = await fetch("/api/shortlink/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: v, customAlias: alias.trim() || undefined, expiresIn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? s.netErr);
        return;
      }
      setResult(data);
    } catch {
      setError(s.netErr);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.shortUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function showQr() {
    if (!result) return;
    if (!qr) {
      const res = await fetch(`/api/qr/${encodeURIComponent(result.shortCode)}`);
      const data = await res.json();
      if (data.qrDataUrl) setQr(data.qrDataUrl);
    }
    setQrOpen(true);
  }

  async function share() {
    if (!result) return;
    const nav = navigator as Navigator & {
      share?: (d: { title: string; text: string; url: string }) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({ title: "Singkt", text: result.shortUrl, url: result.shortUrl });
      } catch {
        // dismissed
      }
    } else {
      copy();
    }
  }

  function reset() {
    setResult(null);
    setUrl("");
    setAlias("");
    setQr("");
    setQrOpen(false);
    setError("");
  }

  if (result) {
    return (
      <div className="card shorten-card result">
        <p style={{ margin: 0, fontWeight: 700 }}>{s.okTitle}</p>
        <a className="result-url" href={result.shortUrl} target="_blank" rel="noopener noreferrer">
          {result.shortUrl}
        </a>
        <div className="row">
          <button className="btn accent" onClick={copy} type="button">
            {copied ? s.copied : s.copy}
          </button>
          <button className="btn secondary" onClick={showQr} type="button">
            {s.qr}
          </button>
          <button className="btn secondary" onClick={share} type="button">
            {s.share}
          </button>
          <button className="btn secondary" onClick={reset} type="button">
            {s.new}
          </button>
        </div>
        {copied && <p className="feedback">{s.copiedMsg}</p>}
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          <a href={`/preview/${encodeURIComponent(result.shortCode)}`}>{s.preview}</a>
          {" · "}
          <a href={`/stats/${encodeURIComponent(result.shortCode)}`}>{s.stats}</a>
          {result.expiresAt
            ? ` · ${s.expiredOn}: ${new Date(result.expiresAt).toLocaleDateString()}`
            : ` · ${s.noExpiry}`}
        </p>
        {qrOpen && qr && (
          <div style={{ marginTop: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr-img" src={qr} alt={result.shortUrl} />
            <div className="row">
              <a className="btn secondary" href={qr} download={`singkat-${result.shortCode}-qr.png`}>
                {s.downloadQr}
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="card shorten-card" onSubmit={submit} noValidate>
      <label htmlFor="url-input" className="muted" style={{ fontSize: 14 }}>
        {s.heroDesc}
      </label>
      <PasteClearInput
        id="url-input"
        wrapperStyle={{ marginTop: 8 }}
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder={s.placeholder}
        value={url}
        onChange={setUrl}
      />
      <details className="advanced">
        <summary>{s.advanced}</summary>
        <div className="row">
          <input
            className="input alias-input grow"
            placeholder={s.aliasPh}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={30}
          />
          <select
            className="input alias-input"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            aria-label={s.expiry}
          >
            {EXPIRY_VALUES.map((v, i) => (
              <option key={v} value={v}>
                {dict.expiryOpts[i] ?? v}
              </option>
            ))}
          </select>
        </div>
      </details>
      <div className="row">
        <button className="btn grow" type="submit" disabled={loading}>
          {loading ? s.working : s.button}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="trust">{s.trust}</p>
    </form>
  );
}
