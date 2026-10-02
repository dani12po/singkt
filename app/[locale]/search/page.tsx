import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SearchClient from "@/components/SearchClient";
import { buildMetadata } from "@/lib/seo/metadata";
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
    title: `${d.search.title} — Singkt`,
    description: d.search.sub,
    path: "/search",
    locale: params.locale,
  });
}

export default function SearchPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <SearchClient dict={getDict(params.locale)} locale={params.locale} />;
}
