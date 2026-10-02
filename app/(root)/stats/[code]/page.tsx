"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalClicks: number;
  today: number;
  last7Days: number;
  last30Days: number;
  lastClickedAt: string | null;
  byDevice: { device: string | null; _count: number }[];
  byBrowser: { browser: string | null; _count: number }[];
  topReferrers: { referrer: string | null; _count: number }[];
  topCountries: { country: string | null; _count: number }[];
};

export default function StatsPage({ params }: { params: { code: string } }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/stats/${encodeURIComponent(params.code)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "Gagal memuat statistik.");
        else setStats(d);
      })
      .catch(() => setError("Jaringan bermasalah."));
  }, [params.code]);

  return (
    <div className="container prose">
      <h1>Statistik link</h1>
      <p className="muted">Kode: {params.code} (anonim, tanpa penyimpanan IP)</p>
      {error && <p className="error">{error}</p>}
      {!stats && !error && <p className="muted">Memuat…</p>}
      {stats && (
        <div className="card">
          <p><strong>Total clicks:</strong> {stats.totalClicks}</p>
          <p><strong>Hari ini:</strong> {stats.today}</p>
          <p><strong>7 hari terakhir:</strong> {stats.last7Days}</p>
          <p><strong>30 hari terakhir:</strong> {stats.last30Days}</p>
          <p className="muted">
            Terakhir diklik:{" "}
            {stats.lastClickedAt
              ? new Date(stats.lastClickedAt).toLocaleString("id-ID")
              : "belum pernah"}
          </p>
          <p className="muted">
            Device: {stats.byDevice.map((d) => `${d.device ?? "?"} (${d._count})`).join(", ") || "—"}
          </p>
          <p className="muted">
            Browser: {stats.byBrowser.map((d) => `${d.browser ?? "?"} (${d._count})`).join(", ") || "—"}
          </p>
          <p className="muted">
            Top referrers: {(stats.topReferrers ?? []).map((d) => `${d.referrer ?? "langsung"} (${d._count})`).join(", ") || "—"}
          </p>
          <p className="muted">
            Top countries: {(stats.topCountries ?? []).map((d) => `${d.country ?? "?"} (${d._count})`).join(", ") || "—"}
          </p>
        </div>
      )}
      <p><a href="/">Kembali</a></p>
    </div>
  );
}
