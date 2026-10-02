import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Tentang Singkt — URL Shortener & Downloader Gratis",
  description: "Singkt adalah layanan pemendek URL dan downloader media gratis tanpa login dan tanpa registrasi.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="container prose">
      <h1>Tentang Singkt</h1>
      <p>
        Singkt adalah layanan pemendek URL gratis tanpa login dan tanpa registrasi.
        Tempel link panjang, dapatkan shortlink, bagikan dengan mudah — lengkap dengan
        QR code, alias kustom, masa kedaluwarsa, dan statistik anonim.
      </p>
      <p className="muted">
        Kami berkomitmen pada transparansi: redirect server-side yang jujur, tanpa
        cloaking, tanpa iklan paksa, dan dengan penanganan abuse yang serius.
      </p>
    </div>
  );
}
