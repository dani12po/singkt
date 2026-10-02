import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/tiktok-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/tiktok-video-downloader" />;
}
