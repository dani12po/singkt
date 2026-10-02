import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { shortUrlOf } from "@/lib/config";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const _shield = guardApiRequest(_req);
  if (_shield) return _shield;
  const code = params.code.trim().slice(0, 64);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
    return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });
  }
  // QR always points at the Singkt shortlink, never the raw destination.
  const url = shortUrlOf(code);
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    return NextResponse.json({ shortUrl: url, qrDataUrl: dataUrl });
  } catch {
    return NextResponse.json({ error: "Gagal membuat QR." }, { status: 500 });
  }
}
