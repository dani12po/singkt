import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/facebook-hd-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/facebook-hd-video-downloader" />;
}
