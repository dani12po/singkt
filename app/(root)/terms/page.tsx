import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service — Singkt",
  description: "Syarat penggunaan Singkt: larangan phishing, malware, scam, spam, dan abuse.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container prose">
      <h1>Terms of Service</h1>
      <p>Dengan menggunakan Singkt, Anda setuju untuk tidak menggunakannya untuk:</p>
      <ul>
        <li>phishing, malware, scam, atau konten ilegal;</li>
        <li>spam atau abuse;</li>
        <li>redirect berbahaya atau penyamaran URL tujuan;</li>
        <li>upaya mengakali safe-browsing atau sistem keamanan platform lain.</li>
      </ul>
      <p>
        Link yang melanggar dapat dinonaktifkan tanpa pemberitahuan. Domain yang
        berulang disalahgunakan dapat diblokir. Layanan disediakan “apa adanya”
        tanpa jaminan ketersediaan.
      </p>
      <h2>Cookie & Persetujuan Pengguna</h2>
      <p>
        Dengan terus menggunakan Singkt setelah melihat banner persetujuan,
        Anda menyetujui penggunaan cookie dan penyimpanan lokal berikut:
      </p>
      <ul>
        <li>
          <strong>Cookie fungsional wajib</strong> — sesi admin dan preferensi
          bahasa (<code>singkat_locale</code>) agar situs dapat berfungsi.
          Cookie ini tidak dapat dimatikan tanpa mengganggu layanan.
        </li>
        <li>
          <strong>Penyimpanan lokal peramban</strong> — pilihan bahasa dan
          status banner persetujuan, tersimpan hanya di perangkat Anda.
        </li>
        <li>
          <strong>Analitik opsional</strong> — hanya dimuat jika Anda menekan
          “Terima”, dan hanya berupa agregat anonim (Google Analytics).
          Menolak tidak mengurangi fungsi apa pun.
        </li>
      </ul>
      <p>
        Anda dapat menarik persetujuan kapan saja dengan menghapus cookie dan
        local storage melalui pengaturan peramban, lalu memuat ulang halaman —
        banner akan muncul kembali. Detail teknis ada di halaman{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <h2>Layanan Pihak Ketiga</h2>
      <p>
        Konten yang Anda tempel (mis. URL video) diproses langsung oleh server
        Singkt. Kami tidak menjual data dan tidak memasang pelacak iklan
        pihak ketiga secara default. Jika suatu hari kami menambahkan jaringan
        iklan, banner persetujuan akan meminta izin eksplisit terlebih dahulu.
      </p>
    </div>
  );
}
