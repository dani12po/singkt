import { TOOLS, type ToolId } from "@/lib/tools";
import { BrandIcon } from "@/components/brand-icons";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumb as breadcrumbSchema,
  faqPage as faqSchema,
  howTo as howToSchema,
  softwareApp,
} from "@/lib/seo/structured-data";
import type { Dict } from "@/lib/i18n/dict";
import DownloaderForm, { type DownloaderFormProps } from "@/components/downloader-form";

export function ToolGrid({ except, locale = "en", dict }: { except?: ToolId; locale?: string; dict?: Dict }) {
  const list = except ? TOOLS.filter((t) => t.id !== except) : TOOLS;
  return (
    <div className="tool-grid">
      {list.map((t) => (
        <a key={t.id} className="tool-card" href={`/${locale}${t.route}`}>
          <BrandIcon id={t.icon} size={30} />
          <strong>{dict?.tools[t.id]?.name ?? t.name}</strong>
          <p className="muted">{dict?.tools[t.id]?.tagline ?? t.tagline}</p>
          <span className="open-link">{dict?.misc.openTool ?? "Open Tool →"}</span>
        </a>
      ))}
    </div>
  );
}

export function RelatedTools({ current, locale, dict }: { current: ToolId; locale: string; dict?: Dict }) {
  return (
    <section className="section">
      <h2>{dict?.shell.related ?? "Other Singkt Tools"}</h2>
      <ToolGrid except={current} locale={locale} dict={dict} />
    </section>
  );
}

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p className="muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export interface ToolPageShellProps {
  toolId: ToolId;
  locale: string;
  dict: Dict;
  breadcrumb: string;
  heroTitle: string;
  heroDesc: string;
  form: Omit<DownloaderFormProps, "dict">;
  /** Override canonical route (programmatic landing pages). */
  canonicalPath?: string;
  /** Optional intro paragraphs rendered right after the hero. */
  intro?: string[];
  steps?: { t: string; d: string }[];
  features?: string[];
  faqs?: FaqItem[];
}

export function ToolPageShell(props: ToolPageShellProps) {
  const tool = TOOLS.find((t) => t.id === props.toolId);
  const icon = tool?.icon ?? props.toolId;
  const route = props.canonicalPath ?? `/${props.locale}${tool?.route ?? "/"}`;
  const toolName = tool?.name ?? props.breadcrumb;
  const steps = props.steps ?? props.dict.toolShared.steps;
  const features = props.features ?? props.dict.toolShared.features;
  const faqs = props.faqs ?? [];
  return (
    <div className="container">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: `/${props.locale}` },
          { name: props.breadcrumb },
        ])}
      />
      <JsonLd
        data={softwareApp({ name: `${toolName} — Singkt`, path: route, description: props.heroDesc })}
      />
      <JsonLd
        data={howToSchema({
          name: `How to use ${props.breadcrumb}`,
          path: route,
          description: props.heroDesc,
          steps,
        })}
      />
      {faqs.length > 0 && <JsonLd data={faqSchema(route, faqs)} />}
      <p className="breadcrumb">
        <a href={`/${props.locale}`}>Home</a> / {props.breadcrumb}
      </p>
      <section className="hero tool-hero">
        <BrandIcon id={icon} size={54} />
        <h1>{props.heroTitle}</h1>
        <p className="sub">{props.heroDesc}</p>
        <DownloaderForm {...props.form} dict={props.dict} />
      </section>

      {props.intro && props.intro.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          {props.intro.map((p, i) => (
            <p key={i} className={i === 0 ? "" : "muted"}>
              {p}
            </p>
          ))}
        </section>
      )}

      <section className="section">
        <h2>{props.dict.shell.how}</h2>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={s.t}>
              <div className="n">{i + 1}</div>
              <strong>{s.t}</strong>
              <p className="muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{props.dict.shell.features}</h2>
        <div className="card">
          <ul>
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <h2>{props.dict.shell.faq}</h2>
        <FaqList items={faqs} />
      </section>

      <RelatedTools current={props.toolId} locale={props.locale} dict={props.dict} />
    </div>
  );
}
