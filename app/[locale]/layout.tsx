import dynamic from "next/dynamic";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { JsonLd } from "@/components/JsonLd";
import ConsentAnalytics from "@/components/ConsentAnalytics";
// Banner is below-fold UI: split into its own chunk, loaded after hydration.
const CookieConsent = dynamic(() => import("@/components/CookieConsent"), { ssr: false });
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
  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body>
        <JsonLd data={organization()} />
        <JsonLd data={website()} />
        <ConsentAnalytics />
        <AdSense />
        <SiteHeader locale={locale} dict={d} />
        <main>{children}</main>
        <SiteFooter locale={locale} dict={d} />
        <CookieConsent dict={d} />
      </body>
    </html>
  );
}
