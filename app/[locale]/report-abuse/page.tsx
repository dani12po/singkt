import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportAbuseForm from "@/components/ReportAbuseForm";
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
    title: `${d.report.title} — Singkt`,
    description: d.report.sub,
    path: "/report-abuse",
    locale: params.locale,
  });
}

export default function ReportAbusePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <ReportAbuseForm dict={getDict(params.locale)} />;
}
