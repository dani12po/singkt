import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Cari Tool & Tutorial — Singkt",
  description: "Pencarian internal Singkt: tool downloader, tutorial blog, dan halaman bantuan.",
  path: "/search",
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
