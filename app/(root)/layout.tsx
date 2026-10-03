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

const d = getDict("id");

export default function RootPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <JsonLd data={organization()} />
        <JsonLd data={website()} />
        <ConsentAnalytics />
        <AdSense />
        <SiteHeader locale="id" dict={d} />
        <main>{children}</main>
        <SiteFooter locale="id" dict={d} />
        <CookieConsent dict={d} />
      </body>
    </html>
  );
}
