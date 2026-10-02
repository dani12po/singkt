import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/youtube-mp3-downloader");

export default function Page() {
  return <SeoLandingPage slug="/youtube-mp3-downloader" />;
}
