import { xmlResponse, rootSitemapXml } from "@/lib/seo/sitemap";

export async function GET() {
  return xmlResponse(rootSitemapXml());
}
