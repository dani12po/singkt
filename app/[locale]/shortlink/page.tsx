import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShortenForm from "@/components/ShortenForm";
import { FaqList, RelatedTools } from "@/components/tool-ui";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDict, getToolFaqs } from "@/lib/i18n/get";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const d = getDict(params.locale);
  const t = d.tools.shortlink;
  return buildMetadata({
    title: t.seoTitle,
    description: t.seoDescription,
    path: "/shortlink",
    locale: params.locale,
  });
}

export default function ShortlinkPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  const t = d.tools.shortlink;
  return (
    <div className="container">
      <p className="breadcrumb">
        <a href={`/${params.locale}`}>Home</a> / {t.heroTitle}
      </p>
      <section className="hero tool-hero">
        <h1>{t.heroTitle}</h1>
        <p className="sub">{t.heroDesc}</p>
        <ShortenForm dict={d} />
      </section>

      <section className="section">
        <h2>{d.shortlink.how}</h2>
        <div className="steps">
          <div className="step">
            <div className="n">1</div>
            <strong>{d.shortlink.s1t}</strong>
            <p className="muted">{d.shortlink.s1d}</p>
          </div>
          <div className="step">
            <div className="n">2</div>
            <strong>{d.shortlink.s2t}</strong>
            <p className="muted">{d.shortlink.s2d}</p>
          </div>
          <div className="step">
            <div className="n">3</div>
            <strong>{d.shortlink.s3t}</strong>
            <p className="muted">{d.shortlink.s3d}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{d.shortlink.faqTitle}</h2>
        <FaqList items={getToolFaqs("shortlink", params.locale)} />
      </section>

      <RelatedTools current="shortlink" locale={params.locale} dict={d} />
    </div>
  );
}
