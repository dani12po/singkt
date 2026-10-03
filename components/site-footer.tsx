import { TOOLS } from "@/lib/tools";
import type { Dict } from "@/lib/i18n/dict";

/**
 * Shared footer for both app/(root) and app/[locale] layouts.
 * Uses ONE container system (.container) identical to the header.
 */
export default function SiteFooter({ locale, dict }: { locale: string; dict: Dict }) {
  const href = (r: string) => `/${locale}${r}`;
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="logo small">Singkt</div>
          <p className="muted">{dict.footerTagline}</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href={href("/shortlink")}>{dict.tools.shortlink?.name ?? "Shortlink"}</a>
          <a href={href("/faq")}>{dict.nav.faq}</a>
          <a href="/about">{dict.nav.about}</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={href("/report-abuse")}>{dict.nav.report}</a>
        </nav>
      </div>
      <div className="container">
        <p className="muted footer-tools">
          {dict.misc.toolsWord}:{" "}
          {TOOLS.map((t, i) => (
            <span key={t.id}>
              <a href={href(t.route)}>{dict.tools[t.id]?.name ?? t.name}</a>
              {i < TOOLS.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
