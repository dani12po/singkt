import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPageShell } from "@/components/tool-ui";
import { buildMetadata } from "@/lib/seo/metadata";
import { getDict, getToolFaqs } from "@/lib/i18n/get";
import { isLocale } from "@/lib/i18n/locales";

const TOOL = "vimeo" as const;

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const d = getDict(params.locale);
  const tool = d.tools[TOOL];
  return buildMetadata({
    title: tool.seoTitle,
    description: tool.seoDescription,
    path: "/vimeo-downloader",
    locale: params.locale,
  });
}

export default function Page({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  const tool = d.tools[TOOL];
  return (
    <ToolPageShell
      toolId={TOOL}
      locale={params.locale}
      dict={d}
      breadcrumb={tool.heroTitle}
      heroTitle={tool.heroTitle}
      heroDesc={tool.heroDesc}
      form={{
        endpoint: "/api/vimeo/resolve",
        placeholder: tool.placeholder,
        buttonLabel: d.form.download,
        originLabel: tool.originLabel,
      }}
      canonicalPath={`/${params.locale}/vimeo-downloader`}
      faqs={getToolFaqs(TOOL, params.locale)}
    />
  );
}
