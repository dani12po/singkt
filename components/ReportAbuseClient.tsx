"use client";

import { useState } from "react";
import PasteClearInput from "@/components/paste-clear-input";

const REASONS = ["Phishing", "Malware", "Spam", "Scam", "Other"] as const;

export default function ReportAbuseClient() {
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
        setErr(data.error ?? "Gagal mengirim laporan.");
        return;
      }
      setMsg("Terima kasih. Laporan Anda telah kami terima dan akan ditinjau.");
      setShortCode("");
      setDetail("");
    } catch {
      setErr("Jaringan bermasalah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container prose">
      <h1>Report Abuse</h1>
      <p className="muted">Laporkan shortlink yang mengarah ke phishing, malware, spam, atau scam.</p>
      <form className="card" onSubmit={submit}>
        <label htmlFor="rc">Shortlink:</label>
        <PasteClearInput
          id="rc"
          placeholder="https://domain-anda/aX72kP atau aX72kP"
          value={shortCode}
          onChange={setShortCode}
          required
        />
        <div style={{ marginTop: 12 }}>
          <label htmlFor="reason">Alasan:</label>
          <select
            id="reason"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label htmlFor="detail">Detail:</label>
          <textarea
            id="detail"
            className="input"
            rows={4}
            maxLength={2000}
            placeholder="Jelaskan secara singkat…"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
        <div className="row">
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Mengirim…" : "Kirim Laporan"}
          </button>
        </div>
        {err && <p className="error">{err}</p>}
        {msg && <p className="feedback">{msg}</p>}
      </form>
    </div>
  );
}
