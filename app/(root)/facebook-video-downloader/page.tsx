import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/facebook-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/facebook-video-downloader" />;
}
