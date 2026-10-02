"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/locales";

function readStored(): string | null {
  try {
    return localStorage.getItem("singkat_locale");
  } catch {
    return null;
  }
}

export default function LocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(current);

  // If the cookie is gone but localStorage remembers a choice, apply it.
  useEffect(() => {
    const stored = readStored();
    if (stored && stored !== current && LOCALES.some((l) => l.code === stored)) {
      swap(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function swap(code: string) {
    setValue(code);
    try {
      localStorage.setItem("singkat_locale", code);
    } catch {
      // storage unavailable — cookie still works
    }
    document.cookie = `singkat_locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
    const seg = pathname.split("/");
    seg[1] = code;
    router.push(seg.join("/") || "/");
  }

  return (
    <select
      className="locale-select"
      value={value}
      onChange={(e) => swap(e.target.value)}
      aria-label="Language / Bahasa"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
