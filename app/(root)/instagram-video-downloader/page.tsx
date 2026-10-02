import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/instagram-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/instagram-video-downloader" />;
}
