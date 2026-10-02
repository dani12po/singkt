import { TOOLS } from "@/lib/tools";
import { BrandIcon } from "@/components/brand-icons";
import { JsonLd } from "@/components/JsonLd";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import CookieConsent from "@/components/CookieConsent";
import ConsentAnalytics from "@/components/ConsentAnalytics";
import AdSense from "@/components/AdSense";
import { organization, website } from "@/lib/seo/structured-data";
import { getDict } from "@/lib/i18n/get";
import { isLocale, localeDir, normalizeLocale } from "@/lib/i18n/locales";
import { notFound } from "next/navigation";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = normalizeLocale(params.locale);
  if (!isLocale(params.locale)) notFound();
  const d = getDict(locale);
  const href = (r: string) => `/${locale}${r}`;
  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body>
        <JsonLd data={organization()} />
        <JsonLd data={website()} />
        <ConsentAnalytics />
        <AdSense />
        <nav className="nav">
          <div className="container nav-inner">
            <a href={`/${locale}`} className="logo" aria-label="Singkt home">
              Singkt
            </a>
            <div className="nav-links desktop-only">
              <div className="dropdown">
                <button className="drop-btn" type="button" aria-haspopup="true">
                  {d.nav.tools} ▾
                </button>
                <div className="dropdown-menu" role="menu">
                  {TOOLS.map((t) => (
                    <a key={t.id} href={href(t.route)} role="menuitem" className="menu-item">
                      <BrandIcon id={t.icon} size={18} /> {d.tools[t.id]?.name ?? t.name}
                    </a>
                  ))}
                </div>
              </div>
              <a href={href("/faq")}>{d.nav.faq}</a>
              <a href={href("/about")}>{d.nav.about}</a>
              <LocaleSwitcher current={locale} />
            </div>
            <details className="mobile-nav">
              <summary aria-label="Menu">☰</summary>
              <div className="mobile-menu">
                {TOOLS.map((t) => (
                  <a key={t.id} href={href(t.route)} className="menu-item">
                    <BrandIcon id={t.icon} size={18} /> {d.tools[t.id]?.name ?? t.name}
                  </a>
                ))}
                <a href={href("/faq")}>{d.nav.faq}</a>
                <a href={href("/about")}>{d.nav.about}</a>
                <a href={href("/report-abuse")}>{d.nav.report}</a>
                <LocaleSwitcher current={locale} />
              </div>
            </details>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <div className="logo small">Singkt</div>
              <p className="muted">{d.footerTagline}</p>
            </div>
            <div className="footer-links">
              <a href={href("/shortlink")}>{d.tools.shortlink?.name ?? "Shortlink"}</a>
              <a href={href("/faq")}>{d.nav.faq}</a>
              <a href="/about">{d.nav.about}</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href={href("/report-abuse")}>{d.nav.report}</a>
            </div>
          </div>
          <div className="container">
            <p className="muted" style={{ fontSize: 12 }}>
              {d.misc.toolsWord}:{" "}
              {TOOLS.map((t, i) => (
                <span key={t.id}>
                  <a href={href(t.route)}>{d.tools[t.id]?.name ?? t.name}</a>
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
