"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/locales";

/**
 * Compact custom language control replacing the native <select>.
 * Full listbox semantics: ArrowUp/Down, Enter, ESC, click-outside.
 * Only lists locales supported by LOCALES — never invents languages.
 */
export default function LanguageSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const currentLabel = LOCALES.find((l) => l.code === current)?.label ?? current;

  function swap(code: string) {
    if (code === current) {
      setOpen(false);
      return;
    }
    try {
      localStorage.setItem("singkat_locale", code);
    } catch {
      // storage unavailable — cookie still works
    }
    document.cookie = `singkat_locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
    const seg = pathname.split("/");
    seg[1] = code;
    router.push(seg.join("/") || "/");
    setOpen(false);
  }

  // Apply a remembered choice once (same behavior as the old switcher).
  useEffect(() => {
    try {
      const stored = localStorage.getItem("singkat_locale");
      if (stored && stored !== current && LOCALES.some((l) => l.code === stored)) {
        const seg = pathname.split("/");
        seg[1] = stored;
        router.push(seg.join("/") || "/");
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  function onListKey(e: React.KeyboardEvent) {
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (items[i + 1] ?? items[0])?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (items[i - 1] ?? items[items.length - 1])?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.click();
    }
  }

  return (
    <div className="lang" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="singkt-lang-list"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lang-globe" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <span className="lang-label">{currentLabel}</span>
        <span className={`lang-chev${open ? " open" : ""}`} aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          id="singkt-lang-list"
          className="lang-menu"
          role="listbox"
          aria-label="Language / Bahasa"
          onKeyDown={onListKey}
        >
          {LOCALES.map((l) => (
            <li
              key={l.code}
              role="option"
              tabIndex={0}
              aria-selected={l.code === current}
              className={`lang-item${l.code === current ? " active" : ""}`}
              onClick={() => swap(l.code)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  swap(l.code);
                }
              }}
            >
              <span>{l.label}</span>
              {l.code === current && <span aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
