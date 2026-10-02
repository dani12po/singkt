import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/instagram-reel-downloader");

export default function Page() {
  return <SeoLandingPage slug="/instagram-reel-downloader" />;
}
