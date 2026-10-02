import type { Metadata } from "next";
import { SeoLandingPage, landingMetadata } from "@/components/seo-landing";

export const metadata: Metadata = landingMetadata("/youtube-shorts-downloader");

export default function Page() {
  return <SeoLandingPage slug="/youtube-shorts-downloader" />;
}
