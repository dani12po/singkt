import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/tool-ui";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { faqPage } from "@/lib/seo/structured-data";
import { getDict } from "@/lib/i18n/get";
import { isLocale } from "@/lib/i18n/locales";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const d = getDict(params.locale);
  return buildMetadata({
    title: `${d.generalFaq.title} — Singkt`,
    description: d.generalFaq.items[0]?.a ?? d.home.sub,
    path: "/faq",
    locale: params.locale,
  });
}

export default function FaqPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  return (
    <div className="container prose">
      <JsonLd data={faqPage(`/${params.locale}/faq`, d.generalFaq.items)} />
      <p className="breadcrumb">
        <a href={`/${params.locale}`}>Home</a> / {d.generalFaq.title}
      </p>
      <h1>{d.generalFaq.title}</h1>
      <FaqList items={d.generalFaq.items} />
    </div>
  );
}
