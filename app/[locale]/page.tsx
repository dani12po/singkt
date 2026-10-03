import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolGrid } from "@/components/tool-ui";
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
    title: `Singkt — ${d.home.line1} ${d.home.line2}`,
    description: d.home.sub,
    path: "/",
    locale: params.locale,
  });
}

export default function Home({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  return (
    <div className="container">
      <section className="hero hero-home">
        <h1>
          {d.home.brand}
          <br />
          {d.home.line1}
          <br />
          {d.home.line2}
        </h1>
        <p className="sub">{d.home.sub}</p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <h2>{d.home.toolsHeading}</h2>
        <ToolGrid locale={params.locale} dict={d} />
      </section>

      <section className="section">
        <h2>{d.home.whyHeading}</h2>
        <div className="steps">
          {d.home.why.map((w) => (
            <div className="step" key={w.t}>
              <div className="n">✓</div>
              <strong>{w.t}</strong>
              <p className="muted">{w.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
