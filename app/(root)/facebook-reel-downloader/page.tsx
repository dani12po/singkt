import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/facebook-reel-downloader");

export default function Page() {
  return <SeoLandingPage slug="/facebook-reel-downloader" />;
}
