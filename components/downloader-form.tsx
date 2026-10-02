"use client";

import { useEffect, useRef, useState } from "react";
import { detectPlatform, PLATFORM_META } from "@/lib/downloader/detect";
import type { AudioVariant, DownloadVariant, ImageVariant } from "@/lib/downloader/pipeline";
import type { Dict } from "@/lib/i18n/dict";

export interface DownloaderFormProps {
  endpoint: string;
  placeholder: string;
  buttonLabel: string;
  originLabel: string;
  dict: Dict;
}

type Result = {
  success: true;
  platform: string;
  title: string;
  thumbnail: string | null;
  author: string | null;
  durationSec: number | null;
  sourceUrl: string;
  extractor: string;
  variants: DownloadVariant[];
  audioVariants: AudioVariant[];
  images?: ImageVariant[] | null;
  notices: string[];
  logId?: number | null;
  debug?: {
    platform: string;
    originalUrl: string;
    resolvedUrl: string;
    canonicalUrl: string;
    extractor: string;
    metadata: string;
    videoStreams: number;
    audioStreams: number;
    variants: number;
    audioVariants: number;
    error: string | null;
  } | null;
};

type Stage = "idle" | "analyzing" | "extracting" | "preparing" | "done" | "error";
type Tab = "video" | "audio" | "photos";

const CLIENT_TIMEOUT_MS = 120000;

function fmtDuration(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return "";
  return ` · ${(bytes / 1048576).toFixed(1)} MB`;
}

function swallow<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

function fileNameOf(url: string, fallback: string): string {
  try {
    const u = new URL(url, "http://localhost");
    const fn = u.searchParams.get("fn");
    if (fn) return fn;
    const seg = u.pathname.split("/").pop();
    if (seg && seg.includes(".")) return seg;
  } catch {
    // ignore
  }
  return fallback;
}

export default function DownloaderForm(props: DownloaderFormProps) {
  const d = props.dict;
  const F = d.form;
  const A = d.ad;
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<Tab>("video");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [adFor, setAdFor] = useState<{
    url: string;
    quality: string;
    sessionId: string;
    waitSec: number;
  } | null>(null);
  const [adLeft, setAdLeft] = useState(0);
  const [adBusy, setAdBusy] = useState(false);
  const pending = useRef(false);
  const startRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const detected = detectPlatform(url.trim());
  const meta = detected !== "generic" && detected !== "unknown" ? PLATFORM_META[detected] : null;

  const busy = stage === "analyzing" || stage === "extracting" || stage === "preparing";
  const canSubmit = url.trim().length > 0 && !busy;
  const submitDisabled = mounted && !canSubmit;
  const submitTitle = !mounted
    ? props.buttonLabel
    : url.trim().length === 0
      ? F.empty
      : busy
        ? F.preparing
        : props.buttonLabel;

  const STAGE_TEXT: Record<string, string> = {
    analyzing: F.analyzing,
    extracting: F.extracting,
    preparing: F.preparing,
  };

  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [busy]);

  const waitSec = adFor?.waitSec ?? 30;
  useEffect(() => {
    if (!adFor) return;
    setAdLeft(adFor.waitSec);
    const t = setInterval(() => {
      setAdLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [adFor]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (pending.current) return;
    setError("");
    setErrorCode("");
    setResult(null);
    const v = url.trim();
    if (!v) {
      setError(F.empty);
      setErrorCode("EMPTY");
      setStage("error");
      return;
    }
    if (!/^https?:\/\//i.test(v)) {
      setError(F.invalid);
      setErrorCode("INVALID");
      setStage("error");
      return;
    }
    pending.current = true;
    startRef.current = Date.now();
    setStage("analyzing");
    const finder = setTimeout(() => {
      if (pending.current) setStage("extracting");
    }, 600);
    const ctrl = new AbortController();
    const killer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(props.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: v }),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let data: {
        success?: boolean;
        variants?: unknown[];
        audioVariants?: unknown[];
        images?: unknown[];
        error?: string;
        code?: string;
      };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        setError(`Server error (HTTP ${res.status}).`);
        setErrorCode(`HTTP_${res.status}`);
        setStage("error");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? F.noresult);
        setErrorCode(data.code ?? `HTTP_${res.status}`);
        setStage("error");
        return;
      }
      const hasMedia =
        data.success &&
        (swallow(data.variants).length > 0 ||
          swallow(data.audioVariants).length > 0 ||
          swallow(data.images).length > 0);
      if (!hasMedia) {
        setError(data.error ?? F.noresult);
        setErrorCode(data.code ?? "NO_VARIANTS");
        setStage("error");
        return;
      }
      setStage("preparing");
      await new Promise((r) => setTimeout(r, 150));
      setResult(data as Result);
      setTab(
        swallow(data.variants).length > 0
          ? "video"
          : swallow(data.audioVariants).length > 0
            ? "audio"
            : "photos"
      );
      setStage("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(F.timeout);
        setErrorCode("TIMEOUT");
      } else {
        setError(F.network);
        setErrorCode("NETWORK");
      }
      setStage("error");
    } finally {
      pending.current = false;
      clearTimeout(finder);
      clearTimeout(killer);
    }
  }

  function reset() {
    setResult(null);
    setUrl("");
    setError("");
    setErrorCode("");
    setStage("idle");
    setElapsed(0);
    setAdFor(null);
  }

  function ticketOf(variantUrl: string): string | null {
    try {
      const u = new URL(variantUrl, window.location.origin);
      return u.searchParams.get("t");
    } catch {
      return null;
    }
  }

  function withLog(variantUrl: string): string {
    if (!result?.logId) return variantUrl;
    return variantUrl.includes("?")
      ? `${variantUrl}&lid=${result.logId}`
      : `${variantUrl}?lid=${result.logId}`;
  }

  async function downloadFile(rawUrl: string, quality: string) {
    const key = `${quality}:${rawUrl}`;
    setDownloading(key);
    setError("");
    setErrorCode("");
    try {
      const target = withLog(rawUrl);
      try {
        const sep = target.includes("?") ? "&" : "?";
        const chk = await fetch(`${target}${sep}check=1`);
        if (!chk.ok) {
          let msg = `Download check failed (HTTP ${chk.status}).`;
          let code = `HTTP_${chk.status}`;
          try {
            const j = (await chk.json()) as { error?: string; code?: string };
            if (j.error) msg = j.error;
            if (j.code) code = j.code;
          } catch {
            // keep generic
          }
          setError(msg);
          setErrorCode(code);
          const hint = d.hints[code];
          if (hint) setError((prev) => `${prev} ${hint}`);
          return;
        }
      } catch {
        setError(F.network);
        setErrorCode("NETWORK");
        return;
      }
      const res = await fetch(target);
      if (!res.ok) {
        let msg = `Download failed (HTTP ${res.status}).`;
        let code = `HTTP_${res.status}`;
        try {
          const j = (await res.json()) as { error?: string; code?: string };
          if (j.error) msg = j.error;
          if (j.code) code = j.code;
        } catch {
          // keep generic
        }
        setError(msg);
        setErrorCode(code);
        const hint = d.hints[code];
        if (hint) setError((prev) => `${prev} ${hint}`);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileNameOf(rawUrl, `singkat-${quality}.mp4`);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 4000);
    } catch {
      setError(F.network);
      setErrorCode("NETWORK");
    } finally {
      setDownloading(null);
    }
  }

  async function startDownload(variantUrl: string, quality: string, premium: boolean) {
    if (!premium) {
      void downloadFile(variantUrl, quality);
      return;
    }
    const ticket = ticketOf(variantUrl);
    if (!ticket) {
      setError(F.noresult);
      setErrorCode("LINK_EXPIRED");
      return;
    }
    try {
      const res = await fetch("/api/reward/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, quality, logId: result?.logId ?? undefined }),
      });
      const data = (await res.json()) as { sessionId?: string; waitSec?: number; error?: string };
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? "reward start failed");
      setAdFor({ url: variantUrl, quality, sessionId: data.sessionId, waitSec: data.waitSec ?? 30 });
    } catch (e) {
      setError(e instanceof Error ? e.message : F.rewardFailed);
      setErrorCode("REWARD_FAILED");
    }
  }

  async function finishAd() {
    if (!adFor || adBusy) return;
    setAdBusy(true);
    try {
      const res = await fetch("/api/reward/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: adFor.sessionId }),
      });
      const data = (await res.json()) as { token?: string; exp?: number; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error ?? "reward failed");
      const sep = adFor.url.includes("?") ? "&" : "?";
      const unlocked = `${adFor.url}${sep}tok=${data.token}&exp=${data.exp}`;
      setAdFor(null);
      await downloadFile(unlocked, adFor.quality);
    } catch (e) {
      setError(e instanceof Error ? e.message : F.rewardFailed);
      setErrorCode("REWARD_FAILED");
      setAdFor(null);
    } finally {
      setAdBusy(false);
    }
  }

  if (result) {
    const videos = swallow(result.variants).filter((v) => v.downloadable === true);
    const audios = swallow(result.audioVariants).filter((v) => v.downloadable === true);
    const photos = swallow(result.images).filter((v) => v.downloadable === true);
    const totalFiles = videos.length + audios.length + photos.length;
    return (
      <div className="card shorten-card result">
        <p style={{ margin: 0, fontWeight: 700 }}>
          {F.ready}{" "}
          <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
            • {result.extractor} • {totalFiles} {F.files}
            {dur(result.durationSec)}
          </span>
        </p>
        {result.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="qr-img"
            style={{ width: 280, height: "auto", marginTop: 12 }}
            src={result.thumbnail}
            alt={result.title ?? "Media preview"}
            loading="lazy"
          />
        )}
        {result.title && <p style={{ fontWeight: 700 }}>{result.title}</p>}
        {result.author && <p className="muted">by {result.author}</p>}

        {totalFiles === 0 ? (
          <p className="error" role="alert">
            {F.noVariant}
          </p>
        ) : (
          <>
            <div className="row" role="tablist" aria-label="Download modes">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "video"}
                className={tab === "video" ? "btn accent" : "btn secondary"}
                onClick={() => setTab("video")}
                disabled={videos.length === 0}
              >
                {F.video} ({videos.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "audio"}
                className={tab === "audio" ? "btn accent" : "btn secondary"}
                onClick={() => setTab("audio")}
                disabled={audios.length === 0}
              >
                {F.audio} ({audios.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "photos"}
                className={tab === "photos" ? "btn accent" : "btn secondary"}
                onClick={() => setTab("photos")}
                disabled={photos.length === 0}
              >
                📸 {F.photos} ({photos.length})
              </button>
            </div>
            {tab === "video" &&
              videos.map((v) => (
                <VariantRow
                  key={v.label + v.url}
                  title={`${v.quality} · ${v.format.toUpperCase()}`}
                  meta={`${v.width && v.height ? `${v.width}x${v.height} · ` : ""}${v.source === "muxed" ? "video+audio" : "single file"}${fmtSize(v.sizeBytes)}${v.note ? ` · ${v.note}` : ""}${v.quality === "image" ? "" : v.premium ? ` · 🔒 ${F.premium}` : ` · ${F.free}`}`}
                  premium={v.premium}
                  busyKey={downloading}
                  busyLabel={`${F.download}…`}
                  url={v.url}
                  quality={v.quality}
                  label={v.premium ? `🔒 ${F.download}` : F.download}
                  onDownload={() => startDownload(v.url, v.quality, v.premium)}
                />
              ))}
            {tab === "audio" &&
              audios.map((v) => (
                <VariantRow
                  key={v.label + v.url}
                  title={`${v.quality} ${v.format.toUpperCase()}`}
                  meta={`${fmtSize(v.sizeBytes).replace(/^ · /, "")}${v.premium ? ` · 🔒 ${F.premium}` : ` · ${F.free}`}`}
                  premium={v.premium}
                  busyKey={downloading}
                  busyLabel={`${F.download}…`}
                  url={v.url}
                  quality={v.quality}
                  label={v.premium ? `🔒 ${F.download}` : F.download}
                  onDownload={() => startDownload(v.url, v.quality, v.premium)}
                />
              ))}
            {tab === "photos" && (
              <div className="tool-grid" style={{ marginTop: 12 }}>
                {photos.map((p) => (
                  <div className="tool-card" key={p.label + p.url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.label}
                      style={{ width: "100%", height: "auto", borderRadius: 8 }}
                      loading="lazy"
                    />
                    <p className="muted" style={{ fontSize: 13 }}>
                      {p.label}
                      {p.width && p.height ? ` · ${p.width}×${p.height}` : ""}
                    </p>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => startDownload(p.url, p.label, false)}
                    >
                      {F.download} HD
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              {F.freeNote}
            </p>
          </>
        )}
        {stage === "error" && error && <ErrorBox code={errorCode} message={error} onRetry={() => submit()} onResolve={() => submit()} dict={d} />}
        {result.notices.map((n) => (
          <p className="muted" key={n} style={{ fontSize: 13 }}>
            {n}
          </p>
        ))}
        <p className="muted" style={{ fontSize: 13 }}>
          {F.source}:{" "}
          <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">
            {props.originLabel}
          </a>
        </p>
        <div className="row">
          <button className="btn secondary" type="button" onClick={reset}>
            {F.another}
          </button>
        </div>

        {result.debug && (
          <details className="advanced">
            <summary>Debug info (development)</summary>
            <ul className="muted" style={{ fontSize: 13, wordBreak: "break-all" }}>
              <li>Platform: {result.debug.platform}</li>
              <li>Original URL: {result.debug.originalUrl}</li>
              <li>Resolved URL: {result.debug.resolvedUrl}</li>
              <li>Canonical URL: {result.debug.canonicalUrl}</li>
              <li>Extractor: {result.debug.extractor}</li>
              <li>Metadata: {result.debug.metadata}</li>
              <li>Video Streams: {result.debug.videoStreams}</li>
              <li>Audio Streams: {result.debug.audioStreams}</li>
              <li>Variants: {result.debug.variants}</li>
              <li>Audio Variants: {result.debug.audioVariants}</li>
              <li>Extraction Error: {result.debug.error ?? "—"}</li>
            </ul>
          </details>
        )}

        {adFor && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={A.title}>
            <div className="card modal-card">
              <p style={{ fontWeight: 800, marginTop: 0 }}>🎬 {A.title} — {adFor.quality}</p>
              <div className="ad-slot">
                {/* AD HOOK: mount your ad-network component here. */}
                <p className="muted">{A.slotA}</p>
                <p className="muted" style={{ fontSize: 12 }}>
                  {A.slotB}
                </p>
              </div>
              <div className="ad-progress">
                <div
                  className="ad-progress-bar"
                  style={{ width: `${((waitSec - adLeft) / waitSec) * 100}%` }}
                />
              </div>
              {adLeft > 0 ? (
                <p className="muted">{A.wait} {adLeft}s…</p>
              ) : (
                <p className="feedback">{A.done}</p>
              )}
              <div className="row">
                <button
                  type="button"
                  className="btn accent grow"
                  disabled={adLeft > 0 || adBusy}
                  onClick={finishAd}
                >
                  {adBusy ? A.unlocking : adLeft > 0 ? `${A.watching} (${adLeft}s)` : A.unlock}
                </button>
                <button type="button" className="btn secondary" onClick={() => setAdFor(null)}>
                  {A.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="card shorten-card" onSubmit={submit} noValidate>
      <label htmlFor={`dl-${props.endpoint}`} className="muted" style={{ fontSize: 14 }}>
        {F.pasteLabel}{" "}
        {meta ? (
          <span className="badge active" style={{ marginLeft: 6 }}>
            {meta.icon} {meta.name} {F.detected}
          </span>
        ) : url.trim() ? (
          <span className="badge" style={{ marginLeft: 6 }}>
            {F.generic}
          </span>
        ) : null}
      </label>
      <input
        id={`dl-${props.endpoint}`}
        className="input"
        style={{ marginTop: 8 }}
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder={props.placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={busy}
      />
      <div className="row">
        <button className="btn grow" type="submit" disabled={submitDisabled} title={submitTitle}>
          {busy ? `${STAGE_TEXT[stage] ?? F.preparing} (${elapsed}s)` : props.buttonLabel}
        </button>
      </div>
      <div aria-live="polite">
        {stage === "idle" && !error && (
          <p className="muted" style={{ fontSize: 13 }}>
            {F.idleHint}
          </p>
        )}
        {busy && (
          <p className="muted" style={{ fontSize: 13 }}>
            {F.busyHint} {STAGE_TEXT[stage]} ({elapsed}s)
          </p>
        )}
        {stage === "error" && error && (
          <ErrorBox code={errorCode} message={error} onRetry={() => submit()} onResolve={() => submit()} dict={d} />
        )}
      </div>
      <p className="trust">{F.trust}</p>
    </form>
  );

  function dur(sec: number | null): string {
    const s = fmtDuration(sec);
    return s ? ` • ⏱ ${s}` : "";
  }
}

function ErrorBox({
  code,
  message,
  onRetry,
  onResolve,
  dict,
}: {
  code: string;
  message: string;
  onRetry: () => void;
  onResolve?: () => void;
  dict: Dict;
}) {
  return (
    <div>
      <p className="error" role="alert">
        {code ? `[${code}] ` : ""}
        {message}
      </p>
      {dict.hints[code] && <p className="muted" style={{ fontSize: 13 }}>{dict.hints[code]}</p>}
      <div className="row">
        {code === "LINK_EXPIRED" && onResolve ? (
          <button type="button" className="btn accent grow" onClick={onResolve}>
            {dict.form.resolveAgain}
          </button>
        ) : (
          <button type="button" className="btn secondary" onClick={onRetry}>
            {dict.form.retry}
          </button>
        )}
      </div>
    </div>
  );
}

function VariantRow({
  title,
  meta,
  premium,
  busyKey,
  busyLabel,
  url,
  quality,
  label,
  onDownload,
}: {
  title: string;
  meta: string;
  premium: boolean;
  busyKey: string | null;
  busyLabel: string;
  url: string;
  quality: string;
  label: string;
  onDownload: () => void;
}) {
  const active = busyKey === `${quality}:${url}`;
  return (
    <div className="row" style={{ alignItems: "center" }}>
      <span className="grow">
        <strong>{title}</strong>
        <span className="muted"> {meta}</span>
      </span>
      <button type="button" className="btn secondary" onClick={onDownload} disabled={active}>
        {active ? busyLabel : label}
      </button>
    </div>
  );
}
