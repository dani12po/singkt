import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy — Singkt",
  description: "Kebijakan privasi Singkt: data minimal, tanpa akun, tanpa penyimpanan IP permanen.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="container prose">
      <h1>Privacy Policy</h1>
      <p>Singkt meminimalkan pengumpulan data:</p>
      <ul>
        <li>Tidak ada akun, tidak ada registrasi — kami tidak menyimpan nama/email.</li>
        <li>Kami menyimpan URL tujuan dan kode pendek yang Anda buat.</li>
        <li>Statistik klik bersifat agregat (jumlah, perangkat, browser, negara, referrer).</li>
        <li>Kami <strong>tidak menyimpan alamat IP secara permanen</strong>.</li>
        <li>Rate limiting menggunakan memori sementara dan tidak dibagikan ke pihak ketiga.</li>
        <li>Laporan abuse menyimpan kode link, alasan, dan detail yang Anda kirim.</li>
      </ul>
      <h2>Cookie & Penyimpanan Lokal</h2>
      <p>Kami menggunakan penyimpanan berikut, semuanya untuk fungsi situs:</p>
      <ul>
        <li>
          <code>singkat_locale</code> (cookie, 1 tahun) — mengingat pilihan
          bahasa Anda.
        </li>
        <li>
          <code>singkat_cookie_consent</code> (local storage + cookie) —
          mengingat pilihan banner persetujuan Anda.
        </li>
        <li>
          <code>singkat_admin</code> (cookie sesi, httpOnly) — hanya untuk
          administrator yang login; tidak dipakai pengunjung biasa.
        </li>
        <li>
          Google Analytics — <strong>hanya dimuat setelah Anda menekan “Terima”</strong> di
          banner. Tanpa persetujuan, tidak ada request analitik keluar.
        </li>
      </ul>
      <p>
        Kami tidak menggunakan cookie iklan, fingerprinting, atau pelacakan
        lintas situs. Dasar hukum pemrosesan: persetujuan Anda (banner) untuk
        analitik opsional, dan kepentingan sah berupa fungsi inti situs untuk
        sisanya.
      </p>
      <p className="muted">Terakhir diperbarui: 2026.</p>
    </div>
  );
}
