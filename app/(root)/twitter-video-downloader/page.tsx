import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/twitter-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/twitter-video-downloader" />;
}
