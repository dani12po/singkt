import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { article, breadcrumb, faqPage } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { FaqList } from "@/components/tool-ui";
import ShareButtons from "@/components/ShareButtons";
import { BLOG_POSTS, getPost } from "@/lib/blog";
import { BLOG_POSTS_EN, getPostEn } from "@/lib/blog-en";
import { getDict } from "@/lib/i18n/get";
import { isLocale } from "@/lib/i18n/locales";

function postFor(locale: string, slug: string) {
  if (locale === "id") return { post: getPost(slug), fallback: false };
  return { post: getPostEn(slug), fallback: locale !== "en" };
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const { post, fallback } = postFor(params.locale, params.slug);
  if (!post) return {};
  return buildMetadata({
    title: `${post.title} — Singkt Blog`,
    description: post.description,
    path: `/blog/${post.slug}`,
    locale: fallback ? "en" : params.locale,
    canonicalPath: fallback ? `/en/blog/${post.slug}` : `/${params.locale}/blog/${post.slug}`,
    keywords: post.tags,
  });
}

export default function BlogArticle({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  const { post, fallback } = postFor(params.locale, params.slug);
  if (!post) notFound();
  const pool = params.locale === "id" ? BLOG_POSTS : BLOG_POSTS_EN;
  const related = post.related
    .map((s) => pool.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const base = `/${params.locale}/blog`;
  return (
    <div className="container prose">
      <p className="breadcrumb">
        <a href={`/${params.locale}`}>Home</a> / <a href={base}>Blog</a> / {post.title}
      </p>
      <JsonLd data={breadcrumb([{ name: "Home", path: `/${params.locale}` }, { name: "Blog", path: base }, { name: post.title }])} />
      <JsonLd
        data={article({
          title: post.title,
          path: fallback ? `/en/blog/${post.slug}` : `${base}/${post.slug}`,
          description: post.description,
          datePublished: post.date,
          tags: post.tags,
        })}
      />
      <JsonLd data={faqPage(fallback ? `/en/blog/${post.slug}` : `${base}/${post.slug}`, post.faqs)} />
      <h1>{post.title}</h1>
      <p className="muted">
        {new Date(post.date).toLocaleDateString(params.locale, { day: "numeric", month: "long", year: "numeric" })}
        {" · "}{post.tags.map((t) => `#${t}`).join(" ")}
      </p>
      {fallback && (
        <p className="muted" style={{ fontSize: 13 }}>
          Articles are currently available in English — translations are on the way.
        </p>
      )}
      {post.paragraphs.map((p, i) => (
        <p key={i} className={i === 0 ? "" : "muted"}>
          {p}
        </p>
      ))}

      <h2>{d.shell.how}</h2>
      <div className="steps">
        {post.steps.map((s, i) => (
          <div className="step" key={s.t}>
            <div className="n">{i + 1}</div>
            <strong>{s.t}</strong>
            <p className="muted">{s.d}</p>
          </div>
        ))}
      </div>

      <h2>{d.shell.faq}</h2>
      <FaqList items={post.faqs} />

      <h2>Share</h2>
      <ShareButtons title={post.title} path={`${base}/${post.slug}`} />

      <div className="card" style={{ marginTop: 24 }}>
        <div className="row">
          <a className="btn accent" href={`/${params.locale}/downloader`}>
            {d.misc.openTool}
          </a>
          <a className="btn secondary" href={`/${params.locale}/shortlink`}>
            {d.tools.shortlink?.name ?? "Shortlink"}
          </a>
        </div>
      </div>

      {related.length > 0 && (
        <>
          <h2>Related</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <a href={`${base}/${r.slug}`}>{r.title}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
