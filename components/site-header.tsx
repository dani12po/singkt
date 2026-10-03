"use client";

import { useEffect, useRef, useState } from "react";
import { TOOLS, type ToolId } from "@/lib/tools";
import { BrandIcon } from "@/components/brand-icons";
import LanguageSelector from "@/components/language-selector";
import type { Dict } from "@/lib/i18n/dict";

const GROUPS: { key: "download" | "social" | "url"; ids: ToolId[] }[] = [
  { key: "download", ids: ["universal", "video", "image", "audio"] },
  { key: "social", ids: ["tiktok", "facebook", "instagram", "twitter", "youtube", "vimeo", "pinterest"] },
  { key: "url", ids: ["shortlink"] },
];

/**
 * Professional site header — single implementation used by both
 * app/(root) and app/[locale] layouts. Sticky, one container system
 * (.container) shared with the page body, grouped Tools dropdown with
 * full keyboard support, custom language control, accessible mobile nav.
 */
export default function SiteHeader({ locale, dict }: { locale: string; dict: Dict }) {
  const href = (r: string) => `/${locale}${r}`;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-outside + ESC for the Tools dropdown.
  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setToolsOpen(false);
        toolsBtnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  // ESC closes mobile nav and returns focus.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        mobileBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function onToolsKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && !toolsOpen) {
      e.preventDefault();
      setToolsOpen(true);
      requestAnimationFrame(() => {
        toolsRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
      });
      return;
    }
    if (!toolsOpen) return;
    const items = Array.from(
      toolsRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (items[i + 1] ?? items[0])?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (items[i - 1] ?? items[items.length - 1])?.focus();
    } else if (e.key === "Tab") {
      setToolsOpen(false);
    }
  }

  const toolName = (id: ToolId, fallback: string) => dict.tools[id]?.name ?? fallback;
  const toolTag = (id: ToolId, fallback: string) => dict.tools[id]?.tagline ?? fallback;

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="container header-inner">
        <a href={`/${locale}`} className="logo" aria-label="Singkt home">
          Singkt
        </a>

        <nav className="main-nav desktop-nav" aria-label="Primary">
          <div className="tools-wrap" ref={toolsRef}>
            <button
              ref={toolsBtnRef}
              type="button"
              className={`nav-link nav-btn${toolsOpen ? " active" : ""}`}
              aria-haspopup="true"
              aria-expanded={toolsOpen}
              aria-controls="singkt-tools-menu"
              onClick={() => setToolsOpen((v) => !v)}
              onKeyDown={onToolsKey}
            >
              {dict.nav.tools}
              <span className={`chev${toolsOpen ? " open" : ""}`} aria-hidden="true">▾</span>
            </button>
            {toolsOpen && (
              <div
                id="singkt-tools-menu"
                className="tools-menu"
                role="menu"
                aria-label={dict.nav.tools}
                onKeyDown={onToolsKey}
              >
                {GROUPS.map((g) => (
                  <div key={g.key} className="tools-group" role="none">
                    <p className="tools-group-title" role="presentation">
                      {dict.toolGroups[g.key]}
                    </p>
                    {g.ids.map((id) => {
                      const t = TOOLS.find((x) => x.id === id)!;
                      return (
                        <a
                          key={id}
                          href={href(t.route)}
                          role="menuitem"
                          className="menu-item"
                          onClick={() => setToolsOpen(false)}
                        >
                          <BrandIcon id={t.icon} size={18} />
                          <span className="menu-text">
                            <span className="menu-title">{toolName(id, t.name)}</span>
                            <span className="menu-desc">{toolTag(id, t.tagline)}</span>
                          </span>
                        </a>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <a className="nav-link" href={href("/faq")}>
            {dict.nav.faq}
          </a>
          <a className="nav-link" href="/about">
            {dict.nav.about}
          </a>
          <LanguageSelector current={locale} />
        </nav>

        <div className="mobile-wrap" ref={mobileRef}>
          <button
            ref={mobileBtnRef}
            type="button"
            className="menu-btn"
            aria-expanded={mobileOpen}
            aria-controls="singkt-mobile-menu"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="menu-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </span>
          </button>
          {mobileOpen && (
            <nav id="singkt-mobile-menu" className="mobile-menu" aria-label="Primary">
              <p className="mobile-group-title">{dict.nav.tools}</p>
              {TOOLS.map((t) => (
                <a
                  key={t.id}
                  href={href(t.route)}
                  className="menu-item"
                  onClick={() => setMobileOpen(false)}
                >
                  <BrandIcon id={t.icon} size={18} />
                  <span className="menu-title">{toolName(t.id, t.name)}</span>
                </a>
              ))}
              <div className="mobile-divider" role="separator" />
              <a href={href("/faq")} onClick={() => setMobileOpen(false)}>
                {dict.nav.faq}
              </a>
              <a href="/about" onClick={() => setMobileOpen(false)}>
                {dict.nav.about}
              </a>
              <a href={href("/report-abuse")} onClick={() => setMobileOpen(false)}>
                {dict.nav.report}
              </a>
              <div className="mobile-divider" role="separator" />
              <LanguageSelector current={locale} />
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
