import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/x-video-downloader");

export default function Page() {
  return <SeoLandingPage slug="/x-video-downloader" />;
}
