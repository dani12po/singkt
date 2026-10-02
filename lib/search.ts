import { TOOLS } from "@/lib/tools";
import { BLOG_POSTS } from "@/lib/blog";

export interface SearchItem {
  kind: "tool" | "article" | "page";
  title: string;
  description: string;
  route: string;
}

const STATIC_PAGES: SearchItem[] = [
  { kind: "page", title: "FAQ", description: "Pertanyaan umum tentang Singkt.", route: "/faq" },
  { kind: "page", title: "Tentang Singkt", description: "Tentang layanan Singkt.", route: "/about" },
  { kind: "page", title: "Privacy Policy", description: "Kebijakan privasi Singkt.", route: "/privacy" },
  { kind: "page", title: "Terms of Service", description: "Syarat penggunaan Singkt.", route: "/terms" },
  { kind: "page", title: "Report Abuse", description: "Laporkan link berbahaya.", route: "/report-abuse" },
  { kind: "page", title: "Blog", description: "Tutorial download video dan audio.", route: "/blog" },
];

export function searchIndex(): SearchItem[] {
  return [
    ...TOOLS.map((t) => ({
      kind: "tool" as const,
      title: t.name,
      description: t.tagline,
      route: t.route,
    })),
    ...BLOG_POSTS.map((b) => ({
      kind: "article" as const,
      title: b.title,
      description: b.description,
      route: `/blog/${b.slug}`,
    })),
    ...STATIC_PAGES,
  ];
}

export function searchSite(query: string, limit = 10): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored = searchIndex().map((item) => {
    const hay = `${item.title} ${item.description}`.toLowerCase();
    let score = 0;
    for (const word of q.split(/\s+/)) {
      if (item.title.toLowerCase().includes(word)) score += 3;
      else if (hay.includes(word)) score += 1;
    }
    return { item, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);
}
