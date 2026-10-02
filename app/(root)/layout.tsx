import { TOOLS } from "@/lib/tools";
import dynamic from "next/dynamic";
import { BrandIcon } from "@/components/brand-icons";
import { JsonLd } from "@/components/JsonLd";
import ConsentAnalytics from "@/components/ConsentAnalytics";
// Banner is below-fold UI: split into its own chunk, loaded after hydration.
const CookieConsent = dynamic(() => import("@/components/CookieConsent"), { ssr: false });
import AdSense from "@/components/AdSense";
import { organization, website } from "@/lib/seo/structured-data";
import { getDict } from "@/lib/i18n/get";

const L = (r: string) => `/id${r}`;
const d = getDict("id");

export default function RootPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <JsonLd data={organization()} />
        <JsonLd data={website()} />
        <ConsentAnalytics />
        <AdSense />
        <nav className="nav">
          <div className="container nav-inner">
            <a href="/id" className="logo" aria-label="Singkt home">
              Singkt
            </a>
            <div className="nav-links desktop-only">
              <div className="dropdown">
                <button className="drop-btn" type="button" aria-haspopup="true">
                  Tools ▾
                </button>
                <div className="dropdown-menu" role="menu">
                  {TOOLS.map((t) => (
                    <a key={t.id} href={L(t.route)} role="menuitem" className="menu-item">
                      <BrandIcon id={t.icon} size={18} /> {t.name}
                    </a>
                  ))}
                </div>
              </div>
              <a href="/id/faq">FAQ</a>
              <a href="/about">About</a>
            </div>
            <details className="mobile-nav">
              <summary aria-label="Menu">☰</summary>
              <div className="mobile-menu">
                {TOOLS.map((t) => (
                  <a key={t.id} href={L(t.route)} className="menu-item">
                    <BrandIcon id={t.icon} size={18} /> {t.name}
                  </a>
                ))}
                <a href="/id/faq">FAQ</a>
                <a href="/about">About</a>
                <a href="/id/report-abuse">Report Abuse</a>
              </div>
            </details>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <div className="logo small">Singkt</div>
              <p className="muted">Pendekkan link. Bagikan dengan mudah.</p>
            </div>
            <div className="footer-links">
              <a href="/id/shortlink">Shortlink</a>
              <a href="/id/faq">FAQ</a>
              <a href="/about">Tentang</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/id/report-abuse">Report Abuse</a>
            </div>
          </div>
          <div className="container">
            <p className="muted" style={{ fontSize: 12 }}>
              Tools:{" "}
              {TOOLS.map((t, i) => (
                <span key={t.id}>
                  <a href={L(t.route)}>{t.name}</a>
                  {i < TOOLS.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>
        </footer>
        <CookieConsent dict={d} />
      </body>
    </html>
  );
}
