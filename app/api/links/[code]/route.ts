import { NextResponse } from "next/server";
import { shortUrlOf } from "@/lib/config";
import { lookupLink } from "@/lib/link-service";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const _shield = guardApiRequest(_req);
  if (_shield) return _shield;
  const link = await lookupLink(params.code);
  if (!link) {
    return NextResponse.json({ error: "Shortlink tidak ditemukan." }, { status: 404 });
  }
  if (link.status !== "active" || link.isFlagged) {
    return NextResponse.json(
      { error: "Shortlink ini telah dinonaktifkan." },
      { status: 410 }
    );
  }
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Shortlink sudah kedaluwarsa." },
      { status: 410 }
    );
  }
  let destHost = "";
  try {
    destHost = new URL(link.destination).hostname;
  } catch {
    destHost = "";
  }
  return NextResponse.json({
    shortCode: link.shortCode,
    shortUrl: shortUrlOf(link.shortCode),
    destination: link.destination,
    destinationHost: destHost,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    clickCount: link.clickCount,
  });
}
