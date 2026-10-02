"use client";

import { useState } from "react";
import { searchSite } from "@/lib/search";
import { TOOLS } from "@/lib/tools";
import type { Dict } from "@/lib/i18n/dict";

export default function SearchClient({ dict, locale }: { dict: Dict; locale: string }) {
  const [q, setQ] = useState("");
  const results = searchSite(q).map((r) => {
    if (r.kind !== "tool") return r;
    const tool = TOOLS.find((t) => t.route === r.route);
    const loc = tool ? dict.tools[tool.id] : undefined;
    if (!loc) return r;
    return { ...r, title: loc.name, description: loc.tagline };
  });
  return (
    <div className="container">
      <p className="breadcrumb">
        <a href={`/${locale}`}>Home</a> / Search
      </p>
      <section className="hero tool-hero">
        <h1>{dict.search.title}</h1>
        <p className="sub">{dict.search.sub}</p>
        <form className="card shorten-card" onSubmit={(e) => e.preventDefault()} role="search">
          <input
            className="input"
            type="search"
            placeholder={dict.search.placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={dict.search.title}
          />
        </form>
      </section>
      {q.trim().length >= 2 && (
        <section className="section" style={{ paddingTop: 0 }}>
          {results.length === 0 ? (
            <p className="muted">{dict.search.none}</p>
          ) : (
            <div className="tool-grid">
              {results.map((r) => (
                <a
                  key={r.route}
                  className="tool-card"
                  href={r.route.startsWith("/blog/") ? `/${locale}${r.route}` : `/${locale}${r.route}`}
                >
                  <strong>{r.title}</strong>
                  <p className="muted">{r.description}</p>
                  <span className="open-link">{dict.search.open}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
