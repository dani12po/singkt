/**
 * ads.txt — AdSense verification + authorized sellers list.
 * Google checks https://singkt.my.id/ads.txt for this exact line.
 */
export async function GET() {
  const lines = [
    "google.com, pub-5613319962434210, DIRECT, f08c47fec0942fa0",
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
