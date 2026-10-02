import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumb } from "@/lib/seo/structured-data";
import { TOOLS } from "@/lib/tools";
import { LANDING_PAGES } from "@/lib/seo/landing";
import { ROOT_STATIC_ROUTES, blogSlugsFor } from "@/lib/seo/sitemap";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  return buildMetadata({
    title: "Peta Situs — Singkt",
    description:
      "Daftar lengkap halaman Singkt: tools downloader, halaman bantuan, blog, dan halaman legal.",
    path: "/sitemap",
    locale: params.locale,
  });
}

export default function SitemapPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const posts = blogSlugsFor(locale);

  return (
    <div className="container prose">
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: `/${locale}` },
          { name: "Peta Situs" },
        ])}
      />
      <p className="breadcrumb">
        <a href={`/${locale}`}>Home</a> / Peta Situs
      </p>
      <h1>Peta Situs</h1>
      <p className="muted">
        Daftar semua halaman publik Singkt dalam bahasa ini, plus halaman
        utama versi Indonesia.
      </p>

      <h2>Utama</h2>
      <ul>
        <li>
          <a href={`/${locale}`}>Beranda ({locale})</a>
        </li>
        <li>
          <a href={`/${locale}/search`}>Pencarian</a>
        </li>
        <li>
          <a href={`/${locale}/faq`}>FAQ</a>
        </li>
        <li>
          <a href={`/${locale}/report-abuse`}>Lapor Penyalahgunaan</a>
        </li>
        <li>
          <a href={`/${locale}/blog`}>Blog</a>
        </li>
      </ul>

      <h2>Tools</h2>
      <ul>
        {TOOLS.map((t) => (
          <li key={t.route}>
            <a href={`/${locale}${t.route}`}>{t.name}</a>
            {t.tagline ? <span className="muted"> — {t.tagline}</span> : null}
          </li>
        ))}
      </ul>

      <h2>Downloader Populer</h2>
      <ul>
        {LANDING_PAGES.map((p) => (
          <li key={p.route}>
            <a href={p.route}>{p.h1}</a>
          </li>
        ))}
      </ul>

      <h2>Artikel Blog</h2>
      <ul>
        {posts.map((s) => (
          <li key={s}>
            <a href={`/${locale}/blog/${s}`}>{s}</a>
          </li>
        ))}
      </ul>

      <h2>Legal</h2>
      <ul>
        {ROOT_STATIC_ROUTES.map((r) => (
          <li key={r}>
            <a href={r}>{r.replace("/", "")}</a>
          </li>
        ))}
      </ul>

      <h2>File Mesin Pencari</h2>
      <ul>
        <li>
          <a href="/sitemap.xml">sitemap.xml (index)</a>
        </li>
        <li>
          <a href="/sitemap-root.xml">sitemap-root.xml</a>
        </li>
        <li>
          <a href={`/sitemap-${locale}.xml`}>sitemap-{locale}.xml</a>
        </li>
        <li>
          <a href="/robots.txt">robots.txt</a>
        </li>
        <li>
          <a href="/rss">rss</a>
        </li>
      </ul>
    </div>
  );
}
