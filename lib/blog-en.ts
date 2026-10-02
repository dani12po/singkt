import type { BlogPost } from "@/lib/blog";

export const BLOG_POSTS_EN: BlogPost[] = [
  {
    slug: "cara-download-video-facebook",
    title: "How to Download Facebook Videos (Phone & Laptop)",
    description: "Complete guide to downloading Facebook videos on phone and laptop via link — free, no extra apps.",
    date: "2026-09-01",
    tags: ["facebook", "tutorial", "video"],
    paragraphs: [
      "Downloading Facebook videos is simple: you only need the video link. Open Facebook, tap Share on the video, then choose Copy Link.",
      "Paste it into Singkt's Facebook Downloader, press Download, and pick an available quality — e.g. 720p HD when offered. The file saves straight to your device.",
      "This works for public videos, reels, and watch shows. Private or closed-group videos can't be processed because they need login — and Singkt will never ask for your credentials.",
    ],
    steps: [
      { t: "Copy link", d: "Tap Share → Copy Link on the Facebook video." },
      { t: "Paste", d: "Paste it into Singkt Facebook Downloader." },
      { t: "Pick quality", d: "Choose an available resolution." },
      { t: "Save", d: "Press Download and save the file." },
    ],
    faqs: [
      { q: "Do I need an extra app?", a: "No. Just a browser and the video link." },
      { q: "Can I download private group videos?", a: "No. Content requiring login is unsupported." },
      { q: "What file do I get?", a: "MP4 with audio, server-merged when the source splits them." },
    ],
    related: ["cara-download-facebook-reel-hd", "cara-download-mp3-dari-video"],
  },
  {
    slug: "cara-download-facebook-reel-hd",
    title: "How to Download Facebook Reels in HD",
    description: "Download HD Facebook reels with audio via link — easy steps without extra watermark.",
    date: "2026-09-03",
    tags: ["facebook", "reel", "hd"],
    paragraphs: [
      "Facebook reels store video and audio separately on their servers. A good downloader must merge them — exactly what Singkt does server-side.",
      "Copy the reel link (Share → Copy Link), paste it into Facebook Downloader, and pick the highest available quality, e.g. 720p HD. You get one MP4 with sound.",
      "The list only shows resolutions that truly exist. A 720x1280 vertical reel shows as 720p — never a fake 1280p.",
    ],
    steps: [
      { t: "Copy reel link", d: "Share → Copy Link from the reel." },
      { t: "Paste", d: "Paste into Facebook Downloader." },
      { t: "Pick HD", d: "Choose the highest available quality." },
    ],
    faqs: [
      { q: "Does it include audio?", a: "Yes. Video and audio are merged into one MP4." },
      { q: "Why is only 360p shown?", a: "Because the source only provides that — we never fake resolutions." },
    ],
    related: ["cara-download-video-facebook", "cara-download-instagram-reel"],
  },
  {
    slug: "cara-download-youtube-shorts",
    title: "How to Download YouTube Shorts",
    description: "Save favorite YouTube Shorts to phone or laptop via link — with audio-only options.",
    date: "2026-09-05",
    tags: ["youtube", "shorts", "tutorial"],
    paragraphs: [
      "YouTube Shorts use /shorts/ or youtu.be patterns. Copy the link via Share in the YouTube app.",
      "Paste it into Singkt YouTube Downloader. You'll see video info, thumbnail, and available audio tracks.",
      "Only need the song? Open the Audio Only tab and download an available track in its original format. Full video-stream downloads are not offered — we don't bypass YouTube protections.",
    ],
    steps: [
      { t: "Copy Shorts link", d: "Share → Copy link from YouTube." },
      { t: "Paste", d: "Paste into YouTube Downloader." },
      { t: "Download", d: "Save info, thumbnail, or an available audio track." },
    ],
    faqs: [
      { q: "Can I download the Shorts video itself?", a: "Video streams aren't offered; info, thumbnails, and audio are." },
      { q: "Is this against YouTube's rules?", a: "Use only content you own or that's licensed for it." },
    ],
    related: ["cara-download-mp3-dari-video", "cara-download-video-facebook"],
  },
  {
    slug: "cara-download-mp3-dari-video",
    title: "How to Download MP3 from Videos",
    description: "Grab audio tracks (MP3/M4A) from video links or direct files — 64–320kbps quality guide.",
    date: "2026-09-07",
    tags: ["mp3", "audio", "tutorial"],
    paragraphs: [
      "Many videos carry separate audio tracks. Singkt lists them under Audio Only with honest bitrate labels — 64 to 320kbps when available.",
      "For direct audio files (.mp3/.m4a/.ogg), use Audio Downloader: paste the URL, preview, download. No conversion — files arrive exactly as sourced.",
      "Rule of thumb: audio ≤128kbps downloads free instantly; above that unlocks via a 30-second rewarded ad.",
    ],
    steps: [
      { t: "Paste link", d: "A video link or direct audio URL." },
      { t: "Open Audio tab", d: "See the available bitrates." },
      { t: "Download", d: "Pick and save the audio file." },
    ],
    faqs: [
      { q: "Is this YouTube-to-MP3 conversion?", a: "No. Only genuinely available audio tracks are offered." },
      { q: "What format do I get?", a: "The source's own format: MP3, M4A, WebA, or Opus." },
    ],
    related: ["cara-download-youtube-shorts", "cara-download-tiktok-tanpa-watermark"],
  },
  {
    slug: "cara-download-instagram-reel",
    title: "How to Download Instagram Reels",
    description: "Guide to saving public Instagram reels via link — know the limits so you don't waste time.",
    date: "2026-09-09",
    tags: ["instagram", "reel", "tutorial"],
    paragraphs: [
      "Copy the reel link from the three-dot menu in Instagram, then paste it into Singkt Instagram Downloader.",
      "Important: Instagram walls off most content without login. If the reel is public and supported, you'll see results; otherwise the page states the honest reason — never an endless spinner.",
      "Never enter your Instagram username/password into any downloader site, including Singkt (we never ask).",
    ],
    steps: [
      { t: "Copy reel link", d: "Menu ⋯ → Copy Link." },
      { t: "Paste", d: "Paste into Instagram Downloader." },
      { t: "Follow result", d: "Download when available, or read the reason." },
    ],
    faqs: [
      { q: "Why can't my reel be processed?", a: "Likely private, deleted, or login-walled — all beyond supported methods." },
      { q: "Is my account safe?", a: "Yes, this tool asks for no credentials at all." },
    ],
    related: ["cara-download-facebook-reel-hd", "cara-download-tiktok-tanpa-watermark"],
  },
  {
    slug: "cara-download-tiktok-tanpa-watermark",
    title: "How to Download TikTok Without Watermark",
    description: "Honest guide to watermark-free TikTok downloads: when it works, when not, and the safe way.",
    date: "2026-09-11",
    tags: ["tiktok", "tutorial", "no-watermark"],
    paragraphs: [
      "Many sites promise 'no watermark' for every video — reality depends on the streams TikTok serves at the time. Singkt only shows files it can actually fetch.",
      "The method is the same: copy the video link (Share → Copy Link), paste it into TikTok Downloader. When a video stream exists, download buttons appear; when not, you still get video info and its thumbnail.",
      "Avoid sites demanding your TikTok login or shady app installs just to remove watermarks.",
    ],
    steps: [
      { t: "Copy link", d: "Share → Copy Link on TikTok." },
      { t: "Paste", d: "Paste into TikTok Downloader." },
      { t: "Download what's there", d: "Save the available files." },
    ],
    faqs: [
      { q: "Always watermark-free?", a: "Not always — depends on TikTok's streams. We show what's available." },
      { q: "Private videos?", a: "No. Only public videos can be processed." },
    ],
    related: ["cara-download-instagram-reel", "cara-download-mp3-dari-video"],
  },
];

export function getPostEn(slug: string): BlogPost | undefined {
  return BLOG_POSTS_EN.find((p) => p.slug === slug);
}
