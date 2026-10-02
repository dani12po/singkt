import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tool-ui";
import { LANDING_PAGES } from "@/lib/seo/landing";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDict } from "@/lib/i18n/get";

export function landingMetadata(route: string): Metadata {
  const page = LANDING_PAGES.find((p) => p.route === route);
  if (!page) throw new Error(`Unknown landing page: ${route}`);
  return buildMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: page.canonicalRoute ?? page.route,
  });
}

const DEFAULT_STEPS = [
  { t: "Tempel link", d: "Salin link dari aplikasinya, lalu tempel di kolom di atas." },
  { t: "Klik Download", d: "Sistem mendeteksi platform dan mengekstrak media yang tersedia." },
  { t: "Pilih kualitas", d: "Pilih resolusi video atau bitrate audio yang benar-benar ada." },
  { t: "Simpan file", d: "Tekan Download dan simpan file ke perangkat." },
];

export function SeoLandingPage({ slug }: { slug: string }) {
  const page = LANDING_PAGES.find((p) => p.route === slug);
  if (!page) throw new Error(`Unknown landing page: ${slug}`);
  // Programmatic landing pages stay Indonesian (single canonical language).
  const d = getDict("id");
  return (
    <ToolPageShell
      toolId={page.toolId}
      locale="id"
      dict={d}
      breadcrumb={page.h1}
      heroTitle={page.h1}
      heroDesc={page.seoDescription}
      form={{
        endpoint: page.endpoint,
        placeholder: page.placeholder,
        buttonLabel: "Download",
        originLabel: page.originLabel,
      }}
      canonicalPath={page.route}
      intro={page.intro}
      steps={DEFAULT_STEPS}
      features={page.features}
      faqs={page.faqs}
    />
  );
}

export function landingSlugs(): string[] {
  return LANDING_PAGES.map((p) => p.route);
}
