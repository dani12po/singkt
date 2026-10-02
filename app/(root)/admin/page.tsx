"use client";

import { useEffect, useState } from "react";

type Link = {
  shortCode: string;
  destination: string;
  customAlias: string | null;
  createdAt: string;
  expiresAt: string | null;
  status: string;
  clickCount: number;
  isFlagged: boolean;
};

type Report = {
  id: number;
  shortCode: string;
  reason: string;
  detail: string | null;
  createdAt: string;
  status: string;
};

type Domain = { domain: string; reason: string | null };

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [links, setLinks] = useState<Link[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [block, setBlock] = useState("");

  // Session survives refresh via httpOnly cookie.
  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => {
        if (r.ok) {
          setAuthed(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      setToken("");
      setAuthed(true);
      load();
    } else {
      const d = await res.json().catch(() => null);
      setMsg(d?.error ?? "Token salah.");
    }
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "POST" }).catch(() => {});
    setAuthed(false);
    setLinks([]);
    setReports([]);
    setDomains([]);
  }

  async function load() {
    setMsg("");
    try {
      const [l, r, b] = await Promise.all([
        fetch(`/api/admin/links?q=${encodeURIComponent(q)}`).then((x) => x.json()),
        fetch("/api/admin/reports").then((x) => x.json()),
        fetch("/api/admin/blocklist").then((x) => x.json()),
      ]);
      if (l.error) {
        if (l.error === "Unauthorized") setAuthed(false);
        else setMsg(l.error);
      } else if (l.links) {
        setLinks(l.links);
      }
      if (r.reports) setReports(r.reports);
      if (b.domains) setDomains(b.domains);
    } catch {
      setMsg("Jaringan bermasalah.");
    }
  }

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function toggle(shortCode: string, action: "disable" | "enable") {
    setMsg("");
    const res = await fetch("/api/admin/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortCode, action }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setMsg(d?.error ?? "Gagal mengubah status.");
      return;
    }
    load();
  }

  async function review(id: number, status: string) {
    setMsg("");
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setMsg(d?.error ?? "Gagal memproses laporan.");
      return;
    }
    load();
  }

  async function blockDomain(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/blocklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: block, reason: "manual block" }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setMsg(d?.error ?? "Gagal memblokir domain.");
      return;
    }
    setBlock("");
    setMsg(`Domain ${d?.domain?.domain ?? block} diblokir.`);
    load();
  }

  async function unblock(domain: string) {
    setMsg("");
    const res = await fetch(`/api/admin/blocklist?domain=${encodeURIComponent(domain)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setMsg("Gagal membuka blokir.");
      return;
    }
    load();
  }

  if (checking) {
    return (
      <div className="container prose">
        <h1>Admin</h1>
        <p className="muted">Memeriksa sesi…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="container prose">
        <h1>Admin</h1>
        <form className="card" onSubmit={login}>
          <label htmlFor="t">Admin token:</label>
          <input
            id="t"
            className="input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <div className="row">
            <button className="btn" type="submit">Masuk</button>
          </div>
          {msg && <p className="error">{msg}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Admin Panel</h1>
        <span>
          <a className="btn secondary" href="/admin/security" style={{ marginRight: 8 }}>
            Security
          </a>
          <button className="btn secondary" type="button" onClick={logout}>
            Keluar
          </button>
        </span>
      </div>
      {msg && <p className="error">{msg}</p>}
      <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input
          className="input grow"
          placeholder="Cari kode / URL tujuan…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn secondary" type="submit">Cari</button>
      </form>

      <h2>Shortlinks ({links.length})</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>Kode</th><th>Tujuan</th><th>Klik</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.shortCode}>
                <td><code>{l.shortCode}</code></td>
                <td>{l.destination.slice(0, 80)}</td>
                <td>{l.clickCount}</td>
                <td>
                  <span className={`badge ${l.status === "active" && !l.isFlagged ? "active" : "disabled"}`}>
                    {l.isFlagged ? "flagged" : l.status}
                  </span>
                </td>
                <td>
                  {l.status === "active" && !l.isFlagged ? (
                    <button className="btn secondary" onClick={() => toggle(l.shortCode, "disable")}>Disable</button>
                  ) : (
                    <button className="btn secondary" onClick={() => toggle(l.shortCode, "enable")}>Enable</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Laporan abuse ({reports.filter((r) => r.status === "open").length} open)</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Kode</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td><code>{r.shortCode}</code></td>
                <td>{r.reason}</td>
                <td>{r.status}</td>
                <td>
                  <button className="btn secondary" onClick={() => review(r.id, "actioned")}>Action</button>{" "}
                  <button className="btn secondary" onClick={() => review(r.id, "dismissed")}>Dismiss</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Blacklist domain ({domains.length})</h2>
      <form className="row" onSubmit={blockDomain}>
        <input
          className="input grow"
          placeholder="contoh: jahat.example"
          value={block}
          onChange={(e) => setBlock(e.target.value)}
        />
        <button className="btn secondary" type="submit">Blokir</button>
      </form>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr><th>Domain</th><th>Alasan</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.domain}>
                <td><code>{d.domain}</code></td>
                <td>{d.reason ?? "—"}</td>
                <td>
                  <button className="btn secondary" onClick={() => unblock(d.domain)}>Unblock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
