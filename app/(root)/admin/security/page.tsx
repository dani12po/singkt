"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  counters: {
    totalRequests: number;
    blockedRequests: number;
    suspiciousRequests: number;
    rateLimitHits: number;
  };
  topEndpoints: { path: string; hits: number }[];
  rateHitsByPrefix: Record<string, number>;
  recentEvents: {
    t: string;
    ip: string;
    path: string;
    score: number;
    action: string;
    reasons: string[];
  }[];
};

export default function SecurityDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/security")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "Unauthorized");
        else setData(d);
      })
      .catch(() => setError("Jaringan bermasalah."));
  }, []);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <h1>Security Dashboard</h1>
      <p className="muted">
        <a href="/admin">← Kembali ke Admin Panel</a>
      </p>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Memuat…</p>}
      {data && (
        <>
          <div className="steps">
            <div className="step">
              <div className="n">TOTAL</div>
              <strong>{data.counters.totalRequests}</strong>
              <p className="muted">Total Requests</p>
            </div>
            <div className="step">
              <div className="n">BLOCKED</div>
              <strong>{data.counters.blockedRequests}</strong>
              <p className="muted">Blocked Requests</p>
            </div>
            <div className="step">
              <div className="n">SUSPICIOUS</div>
              <strong>{data.counters.suspiciousRequests}</strong>
              <p className="muted">Suspicious Requests</p>
            </div>
            <div className="step">
              <div className="n">RATE LIMIT</div>
              <strong>{data.counters.rateLimitHits}</strong>
              <p className="muted">Rate Limit Hits</p>
            </div>
          </div>

          <h2>Top Endpoints</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr><th>Endpoint</th><th>Hits</th></tr>
              </thead>
              <tbody>
                {data.topEndpoints.map((e) => (
                  <tr key={e.path}>
                    <td><code>{e.path}</code></td>
                    <td>{e.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Rate Hits by Bucket</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr><th>Bucket</th><th>Hits</th></tr>
              </thead>
              <tbody>
                {Object.entries(data.rateHitsByPrefix).map(([k, v]) => (
                  <tr key={k}>
                    <td><code>{k}</code></td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Security Events</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr><th>Time</th><th>IP</th><th>Path</th><th>Score</th><th>Action</th><th>Reasons</th></tr>
              </thead>
              <tbody>
                {data.recentEvents.map((e, i) => (
                  <tr key={`${e.t}-${i}`}>
                    <td>{new Date(e.t).toLocaleString("id-ID")}</td>
                    <td><code>{e.ip}</code></td>
                    <td>{e.path.slice(0, 60)}</td>
                    <td>{e.score}</td>
                    <td>
                      <span className={`badge ${e.action === "allow" ? "active" : "disabled"}`}>
                        {e.action}
                      </span>
                    </td>
                    <td>{e.reasons.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
