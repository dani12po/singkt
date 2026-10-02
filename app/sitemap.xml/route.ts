import { xmlResponse, allPagesSitemapXml } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(allPagesSitemapXml());
}
