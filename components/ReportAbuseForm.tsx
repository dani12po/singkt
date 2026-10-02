"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n/dict";

const REASONS = ["Phishing", "Malware", "Spam", "Scam", "Other"] as const;

export default function ReportAbuseForm({ dict }: { dict: Dict }) {
  const d = dict.report;
  const [shortCode, setShortCode] = useState("");
  const [reason, setReason] = useState<string>("Phishing");
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortCode, reason, detail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Error.");
        return;
      }
      setMsg(d.ok);
      setShortCode("");
      setDetail("");
    } catch {
      setErr(d.send + " — error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container prose">
      <h1>{d.title}</h1>
      <p className="muted">{d.sub}</p>
      <form className="card" onSubmit={submit}>
        <label htmlFor="rc">{d.link}</label>
        <input
          id="rc"
          className="input"
          placeholder="aX72kP"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
          required
        />
        <div style={{ marginTop: 12 }}>
          <label htmlFor="reason">{d.reason}</label>
          <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label htmlFor="detail">{d.detail}</label>
          <textarea
            id="detail"
            className="input"
            rows={4}
            maxLength={2000}
            placeholder={d.detailPh}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
        <div className="row">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? d.sending : d.send}
          </button>
        </div>
        {err && <p className="error">{err}</p>}
        {msg && <p className="feedback">{msg}</p>}
      </form>
    </div>
  );
}
