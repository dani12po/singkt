/** Social sharing helpers. Hashtags are for share text only — modern
 * search engines do not use hashtags as a ranking signal. */

export const SOCIAL_TAGS = [
  "#Singkt",
  "#VideoDownloader",
  "#TikTokDownloader",
  "#YouTubeDownloader",
  "#InstagramDownloader",
  "#FacebookDownloader",
  "#MP3Downloader",
  "#HDVideoDownloader",
];

export function shareLinks(title: string, url: string) {
  const t = encodeURIComponent(title);
  const u = encodeURIComponent(url);
  const tags = encodeURIComponent(SOCIAL_TAGS.slice(0, 4).join(" "));
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}&hashtags=${tags}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
  };
}
