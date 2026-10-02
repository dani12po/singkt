import { xmlResponse, localeSitemapXml } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(localeSitemapXml("fr"));
}
