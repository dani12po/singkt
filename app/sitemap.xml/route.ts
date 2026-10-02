import { xmlResponse, sitemapIndexXml } from "@/lib/seo/sitemap";

export async function GET() {
  return xmlResponse(sitemapIndexXml());
}
