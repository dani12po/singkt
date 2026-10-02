"use client";

import { useRef } from "react";

interface PasteClearInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  id: string;
  value: string;
  onChange: (v: string) => void;
  pasteTitle?: string;
  clearTitle?: string;
  wrapperStyle?: React.CSSProperties;
  wrapperClassName?: string;
}

/**
 * Reusable link input with paste/clear button.
 * Shows paste icon when empty, clear (X) icon when filled —
 * same UX as the original `#paste-clear-btn` snippet.
 * Uses unique IDs per instance (`${id}-paste-clear-btn`) so multiple
 * link columns on one page don't clash; the shared class
 * `.paste-clear-btn` keeps legacy `querySelector` code working.
 */
export default function PasteClearInput({
  id,
  value,
  onChange,
  pasteTitle = "Paste",
  clearTitle = "Clear",
  disabled,
  wrapperStyle,
  wrapperClassName,
  ...rest
}: PasteClearInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const btnId = `${id}-paste-clear-btn`;

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        inputRef.current?.focus();
        return;
      }
    } catch {
      // Clipboard API blocked — fall through to execCommand hint.
    }
    // Fallback: focus + let user paste manually (Ctrl+V).
    inputRef.current?.focus();
    try {
      const ta = document.createElement("textarea");
      document.body.appendChild(ta);
      ta.focus();
      const ok = document.execCommand("paste");
      if (ok && ta.value) onChange(ta.value.trim());
      document.body.removeChild(ta);
    } catch {
      // ignore — user pastes manually
    }
    inputRef.current?.focus();
  }

  function handleClick() {
    if (hasValue) {
      onChange("");
      inputRef.current?.focus();
    } else {
      void handlePaste();
    }
  }

  return (
    <div className={`paste-wrap ${wrapperClassName ?? ""}`} style={wrapperStyle}>
      <input
        {...rest}
        ref={inputRef}
        id={id}
        className={`input paste-input ${rest.className ?? ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        id={btnId}
        className="paste-clear-btn"
        title={hasValue ? clearTitle : pasteTitle}
        aria-label={hasValue ? clearTitle : pasteTitle}
        data-paste-title={pasteTitle}
        data-clear-title={clearTitle}
        data-has-value={hasValue ? "true" : "false"}
        onClick={handleClick}
        disabled={disabled}
      >
        {!hasValue ? (
          <svg className="paste-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        ) : (
          <svg className="paste-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
