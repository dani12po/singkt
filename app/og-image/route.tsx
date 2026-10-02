import { ImageResponse } from "next/og";

/**
 * Auto-generated OG image: /og-image?t=Page+Title
 * Every page's og:image points here with its own title.
 */
export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("t") ?? "Singkt").slice(0, 90);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f172a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 8, fontWeight: 800, color: "#93c5fd" }}>
          Singkt
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 24, lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, marginTop: 24, color: "#cbd5e1" }}>
          Pendekkan link. Bagikan dengan mudah.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
