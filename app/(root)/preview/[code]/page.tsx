import { prisma } from "@/lib/db";
import { shortUrlOf } from "@/lib/config";

export default async function PreviewPage({ params }: { params: { code: string } }) {
  const code = params.code.trim().slice(0, 64);
  const link =
    (await prisma.shortLink.findUnique({ where: { shortCode: code } })) ??
    (await prisma.shortLink.findUnique({ where: { customAlias: code } }));

  if (!link) {
    return (
      <div className="container prose">
        <h1>Link tidak ditemukan</h1>
        <p className="muted">Kode “{code}” tidak terdaftar di Singkt.</p>
        <p><a href="/">Kembali ke beranda</a></p>
      </div>
    );
  }

  let host = "";
  try {
    host = new URL(link.destination).hostname;
  } catch {
    host = "";
  }
  const shortUrl = shortUrlOf(link.shortCode);
  const expired = link.expiresAt && link.expiresAt.getTime() <= Date.now();
  const disabled = link.status !== "active" || link.isFlagged;

  return (
    <div className="container prose">
      <h1>Pratinjau link</h1>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Anda akan menuju:</p>
        <p style={{ fontSize: 22, fontWeight: 800, margin: "4px 0" }}>{host}</p>
        <p className="muted" style={{ wordBreak: "break-all" }}>
          Destination: {link.destination}
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Shortlink: {shortUrl}
          {link.expiresAt ? ` · Kedaluwarsa: ${link.expiresAt.toLocaleString("id-ID")}` : ""}
        </p>
        {expired ? (
          <p className="error">Shortlink sudah kedaluwarsa.</p>
        ) : disabled ? (
          <p className="error">Shortlink ini telah dinonaktifkan.</p>
        ) : (
          <a className="btn accent" href={`/${encodeURIComponent(link.shortCode)}`}>
            Lanjutkan
          </a>
        )}
      </div>
      <p><a href="/">Buat link baru</a></p>
    </div>
  );
}
