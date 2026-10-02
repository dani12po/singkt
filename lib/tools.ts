import { APP_URL } from "@/lib/config";

export type ToolId =
  | "shortlink"
  | "universal"
  | "tiktok"
  | "facebook"
  | "instagram"
  | "twitter"
  | "youtube"
  | "vimeo"
  | "pinterest"
  | "video"
  | "image"
  | "audio";

export interface ToolMeta {
  id: ToolId;
  route: string;
  name: string;
  tagline: string;
  icon: string;
  seoTitle: string;
  seoDescription: string;
}

export const TOOLS: ToolMeta[] = [
  {
    id: "universal",
    route: "/downloader",
    name: "Universal Downloader",
    tagline: "Paste any media link.",
    icon: "universal",
    seoTitle: "Universal Video & Audio Downloader — Singkt",
    seoDescription:
      "Paste any video, image, or audio link — Singkt detects the platform and lists real downloads. Gratis tanpa akun.",
  },
  {
    id: "shortlink",
    route: "/shortlink",
    name: "URL Shortener",
    tagline: "Pendekkan URL panjang.",
    icon: "shortlink",
    seoTitle: "Free URL Shortener — Singkt",
    seoDescription:
      "Pendekkan URL panjang secara gratis tanpa perlu membuat akun. Dilengkapi QR code, alias kustom, dan statistik.",
  },
  {
    id: "tiktok",
    route: "/tiktok-downloader",
    name: "TikTok Downloader",
    tagline: "Download media dari TikTok.",
    icon: "tiktok",
    seoTitle: "TikTok Video Downloader — Singkt",
    seoDescription:
      "Download video TikTok melalui link dengan Singkt. Tempel link, pratinjau, lalu unduh yang tersedia.",
  },
  {
    id: "facebook",
    route: "/facebook-downloader",
    name: "Facebook Downloader",
    tagline: "Download media dari Facebook.",
    icon: "facebook",
    seoTitle: "Facebook Video Downloader — Singkt",
    seoDescription:
      "Tool Facebook downloader Singkt untuk link video Facebook yang didukung. Gratis tanpa akun.",
  },
  {
    id: "instagram",
    route: "/instagram-downloader",
    name: "Instagram Downloader",
    tagline: "Download media publik yang didukung.",
    icon: "instagram",
    seoTitle: "Instagram Downloader — Singkt",
    seoDescription:
      "Instagram downloader untuk konten publik yang didukung: foto, video, dan reel. Gratis tanpa akun.",
  },
  {
    id: "twitter",
    route: "/twitter-downloader",
    name: "X Downloader",
    tagline: "Download media dari X.",
    icon: "twitter",
    seoTitle: "X Twitter Video Downloader — Singkt",
    seoDescription:
      "Download media dari postingan X/Twitter yang didukung melalui link. Gratis tanpa akun.",
  },
  {
    id: "youtube",
    route: "/youtube-downloader",
    name: "YouTube Downloader",
    tagline: "Tool YouTube yang didukung.",
    icon: "youtube",
    seoTitle: "YouTube Downloader — Singkt",
    seoDescription:
      "Lihat info video YouTube dari link dan unduh yang tersedia via metode yang didukung. Gratis tanpa akun.",
  },
  {
    id: "vimeo",
    route: "/vimeo-downloader",
    name: "Vimeo Downloader",
    tagline: "Download video dari Vimeo.",
    icon: "vimeo",
    seoTitle: "Vimeo Video Downloader — Singkt",
    seoDescription:
      "Download video Vimeo melalui link dengan Singkt. Tempel link, pratinjau, lalu unduh kualitas yang tersedia.",
  },
  {
    id: "pinterest",
    route: "/pinterest-downloader",
    name: "Pinterest Downloader",
    tagline: "Download video pin Pinterest.",
    icon: "pinterest",
    seoTitle: "Pinterest Video Downloader — Singkt",
    seoDescription:
      "Download video pin Pinterest melalui link dengan Singkt. Pilihan kualitas video dan audio, gratis tanpa akun.",
  },
  {
    id: "video",
    route: "/video-downloader",
    name: "Video Downloader",
    tagline: "Download direct video URL.",
    icon: "video",
    seoTitle: "Video Downloader — Singkt",
    seoDescription:
      "Download file video langsung (.mp4, .webm, .mov, .m4v) via URL dengan pratinjau. Gratis tanpa akun.",
  },
  {
    id: "image",
    route: "/image-downloader",
    name: "Image Downloader",
    tagline: "Download direct image URL.",
    icon: "image",
    seoTitle: "Image Downloader — Singkt",
    seoDescription:
      "Download gambar langsung (.jpg, .png, .webp, .gif) via URL dengan pratinjau. Gratis tanpa akun.",
  },
  {
    id: "audio",
    route: "/audio-downloader",
    name: "Audio Downloader",
    tagline: "Download direct audio URL.",
    icon: "audio",
    seoTitle: "Audio Downloader — Singkt",
    seoDescription:
      "Download file audio langsung (.mp3, .wav, .m4a, .ogg) via URL dengan pratinjau. Gratis tanpa akun.",
  },
];

export function getTool(id: ToolId): ToolMeta {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tool: ${id}`);
  return t;
}

export function canonicalOf(route: string): string {
  return `${APP_URL}${route}`;
}
