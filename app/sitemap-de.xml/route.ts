import { xmlResponse, localeSitemapXml } from "@/lib/seo/sitemap";

export async function GET() {
  return xmlResponse(localeSitemapXml("de"));
}
