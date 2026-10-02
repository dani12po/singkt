import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { collectionPage } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog";
import { BLOG_POSTS_EN } from "@/lib/blog-en";
import { getDict } from "@/lib/i18n/get";
import { isLocale } from "@/lib/i18n/locales";

function postsFor(locale: string): { posts: BlogPost[]; fallback: boolean } {
  if (locale === "id") return { posts: BLOG_POSTS, fallback: false };
  return { posts: BLOG_POSTS_EN, fallback: locale !== "en" };
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const d = getDict(params.locale);
  return buildMetadata({
    title: `Blog — Singkt`,
    description: d.home.sub,
    path: "/blog",
    locale: params.locale,
  });
}

export default function BlogIndex({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const d = getDict(params.locale);
  const { posts, fallback } = postsFor(params.locale);
  return (
    <div className="container">
      <p className="breadcrumb">
        <a href={`/${params.locale}`}>Home</a> / Blog
      </p>
      <section className="hero tool-hero">
        <h1>Blog Singkt</h1>
        <p className="sub">{d.home.sub}</p>
      </section>
      <JsonLd
        data={collectionPage({
          name: "Blog Singkt",
          path: `/${params.locale}/blog`,
          description: d.home.sub,
        })}
      />
      {fallback && (
        <p className="muted" style={{ fontSize: 13 }}>
          Articles are currently available in English — translations are on the way.
        </p>
      )}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="tool-grid">
          {posts.map((p) => (
            <a key={p.slug} className="tool-card" href={`/${params.locale}/blog/${p.slug}`}>
              <strong>{p.title}</strong>
              <p className="muted">{p.description}</p>
              <span className="open-link">{d.search.open}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
