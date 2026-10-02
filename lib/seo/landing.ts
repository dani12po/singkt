import type { ToolId } from "@/lib/tools";
import type { FaqItem } from "@/components/tool-ui";

export interface LandingPage {
  route: string;
  toolId: ToolId;
  endpoint: string;
  originLabel: string;
  placeholder: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string[];
  features: string[];
  faqs: FaqItem[];
  related: ToolId[];
  canonicalRoute?: string;
}

export const LANDING_PAGES: LandingPage[] = [
  {
    route: "/facebook-video-downloader",
    toolId: "facebook",
    endpoint: "/api/facebook/resolve",
    originLabel: "facebook.com",
    placeholder: "Paste Facebook video URL here...",
    seoTitle: "Facebook Video Downloader HD — Singkt",
    seoDescription:
      "Download video Facebook HD gratis: tempel link watch, pilih kualitas asli 360p–1080p, simpan MP4 dengan audio.",
    h1: "Facebook Video Downloader",
    intro: [
      "Facebook Video Downloader Singkt mengambil video publik Facebook langsung dari link-nya. Tempel URL watch, reel, atau video, lalu pilih resolusi yang benar-benar tersedia — tanpa tebakan, tanpa opsi palsu.",
      "Karena Facebook menyimpan video dan audio terpisah, server kami menggabungkannya (mux) menjadi satu file MP4 final. Hasilnya video HD dengan suara, siap diputar di HP maupun laptop.",
    ],
    features: [
      "Resolusi aktual 360p–1080p sesuai sumber, diurutkan rendah ke tinggi.",
      "Mux video+audio otomatis menjadi satu MP4.",
      "Gratis tanpa akun; 720p+ dibuka via rewarded ad 30 detik.",
    ],
    faqs: [
      { q: "Cara download video Facebook?", a: "Salin link video, tempel di kolom atas, klik Download, pilih kualitas, simpan file." },
      { q: "Apakah bisa download Reel?", a: "Bisa, lewat halaman ini atau Facebook Reel Downloader — keduanya memakai ekstraktor yang sama." },
      { q: "Apakah bisa download HD?", a: "Bisa bila sumbernya menyediakan 720p/1080p. Yang tidak ada tidak ditampilkan." },
      { q: "Apakah ada suaranya?", a: "Ya, trek audio digabung otomatis menjadi satu file." },
    ],
    related: ["facebook", "instagram", "tiktok", "youtube"],
  },
  {
    route: "/facebook-reel-downloader",
    toolId: "facebook",
    endpoint: "/api/facebook/resolve",
    originLabel: "facebook.com",
    placeholder: "Paste Facebook Reel URL here...",
    seoTitle: "Facebook Reel Downloader — Singkt",
    seoDescription:
      "Download reel Facebook vertikal dengan audio: tempel link reel, pilih 360p/540p/720p asli, gratis tanpa akun.",
    h1: "Facebook Reel Downloader",
    intro: [
      "Reel Facebook berformat vertikal dan stream-nya terpisah antara gambar dan suara. Tool ini mengekstrak keduanya lalu menggabungkannya, sehingga Anda mendapat satu file MP4 portrait yang benar.",
      "Label kualitas memakai sisi pendek yang sebenarnya: reel 720x1280 tampil sebagai 720p HD — bukan 1280p palsu.",
    ],
    features: [
      "Khusus link /reel/ dan fb.watch.",
      "Kualitas portrait yang jujur: 360p, 540p, 720p.",
      "Satu file MP4 dengan audio, siap dibagikan ulang.",
    ],
    faqs: [
      { q: "Link reel seperti apa yang didukung?", a: "facebook.com/reel/…, fb.watch/…, dan link share video." },
      { q: "Kenapa reel saya gagal diproses?", a: "Kemungkinan privat, dihapus, atau dibatasi — halaman menampilkan alasannya." },
      { q: "Apakah vertikalnya tetap?", a: "Ya, dimensi portrait dipertahankan apa adanya." },
      { q: "Perlu login Facebook?", a: "Tidak. Singkt tidak pernah meminta kredensial." },
    ],
    related: ["facebook", "instagram", "tiktok"],
  },
  {
    route: "/facebook-hd-video-downloader",
    toolId: "facebook",
    endpoint: "/api/facebook/resolve",
    originLabel: "facebook.com",
    placeholder: "Paste Facebook HD video URL here...",
    seoTitle: "Facebook HD Video Downloader (720p/1080p) — Singkt",
    seoDescription:
      "Download video Facebook kualitas HD 720p dan 1080p bila tersedia. Unlock via rewarded ad 30 detik, tanpa akun.",
    h1: "Facebook HD Video Downloader",
    intro: [
      "Halaman ini fokus ke kualitas tinggi: 720p HD dan 1080p Full HD untuk video Facebook yang menyediakannya. Kualitas di bawahnya tetap tersedia sebagai opsi gratis langsung.",
      "Kualitas HD termasuk kategori premium: tonton rewarded ad 30 detik satu kali untuk membuka token unduhan yang berlaku 10 menit.",
    ],
    features: [
      "Fokus 720p HD / 1080p Full HD.",
      "Token premium HMAC 10 menit, anti-bypass.",
      "Fallback thumbnail bila video gagal tapi metadata ada.",
    ],
    faqs: [
      { q: "Kenapa 1080p tidak selalu ada?", a: "Hanya tampil bila stream 1080p benar-benar disediakan sumbernya." },
      { q: "Bagaimana cara unlock HD?", a: "Klik Download pada kualitas premium, tonton iklan 30 detik, unduhan mulai otomatis." },
      { q: "Apakah token bisa dipakai ulang?", a: "Satu sesi iklan untuk satu unduhan; token kedaluwarsa 10 menit." },
    ],
    related: ["facebook", "youtube", "vimeo"],
  },
  {
    route: "/youtube-video-downloader",
    toolId: "youtube",
    endpoint: "/api/youtube/resolve",
    originLabel: "youtube.com",
    placeholder: "Paste YouTube video URL here...",
    seoTitle: "YouTube Video Downloader — Singkt",
    seoDescription:
      "Lihat info video YouTube dari link: judul, channel, durasi, thumbnail, dan trek audio yang tersedia. Gratis tanpa akun.",
    h1: "YouTube Video Downloader",
    intro: [
      "Tempel link watch YouTube untuk melihat metadata resminya: judul, channel, durasi, dan thumbnail yang bisa diunduh.",
      "Trek audio yang tersedia tampil di tab Audio Only dengan bitrate aslinya. Unduhan stream video penuh tidak ditawarkan — kami tidak mengakali proteksi YouTube.",
    ],
    features: [
      "Metadata resmi: judul, channel, durasi.",
      "Thumbnail HD bisa diunduh.",
      "Trek audio sesuai yang tersedia.",
    ],
    faqs: [
      { q: "Bisa download video YouTube-nya?", a: "Stream video tidak ditawarkan; yang tersedia adalah info, thumbnail, dan audio." },
      { q: "Video privat bisa?", a: "Tidak. Video privat, age-restricted, atau terhapus dilaporkan jujur." },
      { q: "Apakah melanggar aturan YouTube?", a: "Tool ini hanya memakai metadata publik dan tidak membypass proteksi." },
    ],
    related: ["youtube", "tiktok", "facebook"],
  },
  {
    route: "/youtube-shorts-downloader",
    toolId: "youtube",
    endpoint: "/api/youtube/resolve",
    originLabel: "youtube.com",
    placeholder: "Paste YouTube Shorts URL here...",
    seoTitle: "YouTube Shorts Downloader — Singkt",
    seoDescription:
      "Cek info YouTube Shorts dari link /shorts/ atau youtu.be: judul, channel, thumbnail, dan audio yang tersedia.",
    h1: "YouTube Shorts Downloader",
    intro: [
      "Halaman khusus Shorts: mendukung link /shorts/, youtu.be, dan watch biasa. Tempel link untuk melihat info dan aset yang tersedia.",
      "Cocok untuk menyimpan thumbnail atau mengambil trek audionya. Untuk panduan langkah demi langkah, baca artikel blog kami.",
    ],
    features: [
      "Mendukung /shorts/, youtu.be, /watch.",
      "Info + thumbnail + audio sesuai ketersediaan.",
      "Gratis tanpa akun.",
    ],
    faqs: [
      { q: "Cara download Shorts?", a: "Salin link Shorts, tempel di sini, simpan aset yang tersedia." },
      { q: "Apakah shorts-nya ikut terunduh?", a: "Stream video tidak ditawarkan; thumbnail dan audio yang tersedia bisa disimpan." },
      { q: "Link youtu.be didukung?", a: "Ya, short-link otomatis di-expand ke kanonisnya." },
    ],
    related: ["youtube", "tiktok", "instagram"],
  },
  {
    route: "/youtube-mp3-downloader",
    toolId: "youtube",
    endpoint: "/api/youtube/resolve",
    originLabel: "youtube.com",
    placeholder: "Paste YouTube URL for audio here...",
    seoTitle: "YouTube MP3 Downloader — Singkt",
    seoDescription:
      "Ambil trek audio dari link YouTube yang tersedia (M4A/WebA sesuai sumber) lewat tab Audio Only. Jujur tanpa konversi palsu.",
    h1: "YouTube MP3 Downloader",
    intro: [
      "Halaman ini fokus ke audio: tempel link YouTube, buka tab Audio Only, dan unduh trek audio yang memang disediakan sumbernya — lengkap dengan label bitrate asli.",
      "Penting: kami tidak mengonversi video menjadi MP3. Yang tampil hanyalah trek audio yang benar-benar ada, dalam format aslinya.",
    ],
    features: [
      "Label bitrate jujur: 64–320kbps sesuai sumber.",
      "Format asli: M4A, WebA, Opus.",
      "Audio ≤128kbps gratis langsung.",
    ],
    faqs: [
      { q: "Cara download MP3?", a: "Tempel link, buka tab Audio Only, pilih bitrate, tekan Download." },
      { q: "Apakah ini konversi video ke MP3?", a: "Bukan. Hanya trek audio yang tersedia yang ditawarkan." },
      { q: "Kualitas apa saja?", a: "Tergantung sumber: umumnya 48–256kbps." },
    ],
    related: ["youtube", "audio", "video"],
  },
  {
    route: "/instagram-reel-downloader",
    toolId: "instagram",
    endpoint: "/api/instagram/resolve",
    originLabel: "instagram.com",
    placeholder: "Paste Instagram Reel URL here...",
    seoTitle: "Instagram Reel Downloader — Singkt",
    seoDescription:
      "Coba download reel Instagram publik lewat link. Hasil jujur: tersedia atau alasan yang jelas. Gratis tanpa akun.",
    h1: "Instagram Reel Downloader",
    intro: [
      "Tempel link reel Instagram untuk memeriksa ketersediaannya. Instagram membatasi akses tanpa login, sehingga hanya konten yang didukung metode saat ini yang bisa diproses.",
      "Bila berhasil, foto, video, dan trek yang tersedia tampil per tab. Bila tidak, Anda mendapat alasan spesifik — bukan halaman kosong.",
    ],
    features: [
      "Deteksi reel, post, dan TV.",
      "Tab foto/video/audio sesuai isi.",
      "Tanpa login, tanpa kredensial.",
    ],
    faqs: [
      { q: "Cara download Reel?", a: "Salin link reel, tempel di sini, simpan media yang tersedia." },
      { q: "Cara download Post?", a: "Link /p/ foto tampil di tab Photos dan bisa diunduh." },
      { q: "Kenapa reel saya gagal?", a: "Biasanya privat, dihapus, atau butuh login." },
    ],
    related: ["instagram", "facebook", "tiktok"],
  },
  {
    route: "/instagram-video-downloader",
    toolId: "instagram",
    endpoint: "/api/instagram/resolve",
    originLabel: "instagram.com",
    placeholder: "Paste Instagram video URL here...",
    seoTitle: "Instagram Video Downloader — Singkt",
    seoDescription:
      "Download video Instagram publik (post, reel, TV) yang didukung metode saat ini. Gratis tanpa akun.",
    h1: "Instagram Video Downloader",
    intro: [
      "Halaman ini fokus ke konten video Instagram: post video, reel, dan IGTV. Tempel link-nya dan biarkan sistem memeriksa apa yang bisa diambil.",
      "Foto sampul dan thumbnail ikut ditampilkan di tab Photos bila tersedia.",
    ],
    features: [
      "Mendukung /p/, /reel/, /tv/.",
      "Tab video + foto terpisah.",
      "Pesan error spesifik per kegagalan.",
    ],
    faqs: [
      { q: "Cara download Video?", a: "Tempel link video Instagram, pilih kualitas di tab Video." },
      { q: "Apakah carousel didukung?", a: "Foto carousel yang terekspos tampil di tab Photos." },
      { q: "Butuh akun IG?", a: "Tidak, dan kami tidak pernah memintanya." },
    ],
    related: ["instagram", "facebook", "tiktok"],
  },
  {
    route: "/tiktok-video-downloader",
    toolId: "tiktok",
    endpoint: "/api/tiktok/resolve",
    originLabel: "tiktok.com",
    placeholder: "Paste TikTok video URL here...",
    seoTitle: "TikTok Video Downloader Tanpa Watermark — Singkt",
    seoDescription:
      "Download video TikTok lewat link: tempel URL video atau short-link, simpan kualitas dan audio yang tersedia.",
    h1: "TikTok Video Downloader",
    intro: [
      "Tempel link video TikTok — termasuk short-link vm.tiktok.com yang otomatis di-expand — untuk mengekstrak stream yang tersedia.",
      "Bila stream video ada, tombol download muncul per kualitas; trek suara tampil di tab Audio. Bila tidak, info video dan thumbnail tetap bisa disimpan.",
    ],
    features: [
      "Mendukung vm.tiktok.com & vt.tiktok.com.",
      "Kualitas video + trek audio terpisah.",
      "Tanpa watermark tambahan dari kami.",
    ],
    faqs: [
      { q: "Apakah tanpa watermark?", a: "File yang ditawarkan adalah stream asli; kami tidak menambah watermark." },
      { q: "Short-link didukung?", a: "Ya, otomatis di-resolve ke URL kanonis." },
      { q: "Video privat bisa?", a: "Tidak. Hanya video publik." },
    ],
    related: ["tiktok", "instagram", "youtube"],
  },
  {
    route: "/twitter-video-downloader",
    toolId: "twitter",
    endpoint: "/api/twitter/resolve",
    originLabel: "x.com",
    placeholder: "Paste X / Twitter video URL here...",
    seoTitle: "Twitter Video Downloader — Singkt",
    seoDescription:
      "Download video dari postingan X/Twitter lewat link /status/. Kualitas asli + audio, gratis tanpa akun.",
    h1: "Twitter Video Downloader",
    intro: [
      "Tempel link postingan X/Twitter berisi video untuk mengekstrak varian kualitasnya. Format umum dan HLS yang didukung ffmpeg ikut ditangani.",
      "Halaman kembar kami, X Video Downloader, mengarah ke sini sebagai kanonis agar tidak ada konten ganda.",
    ],
    features: [
      "Mendukung x.com dan twitter.com.",
      "Varian kualitas + trek audio.",
      "Gratis tanpa akun.",
    ],
    faqs: [
      { q: "Link seperti apa yang didukung?", a: "Postingan dengan pola /status/ yang memuat video publik." },
      { q: "Postingan terproteksi bisa?", a: "Tidak. Akun terkunci membutuhkan login." },
      { q: "Apakah ada batas ukuran?", a: "Ya, mengikuti batas proxy per jenis media." },
    ],
    related: ["twitter", "tiktok", "facebook"],
  },
  {
    route: "/x-video-downloader",
    toolId: "twitter",
    endpoint: "/api/twitter/resolve",
    originLabel: "x.com",
    placeholder: "Paste X video URL here...",
    seoTitle: "X Video Downloader — Singkt",
    seoDescription:
      "Download video X lewat link. Halaman ini dialihkan secara kanonis ke Twitter Video Downloader.",
    h1: "X Video Downloader",
    intro: [
      "X adalah nama baru Twitter — ekstraktor dan hasilnya identik dengan Twitter Video Downloader, yang menjadi versi kanonis halaman ini.",
    ],
    features: ["Fungsionalitas penuh via halaman kanonis."],
    faqs: [
      { q: "Apa bedanya dengan Twitter Video Downloader?", a: "Tidak ada — halaman ini memakai canonical ke sana." },
      { q: "Link X apa yang didukung?", a: "Postingan X dengan pola /status/ yang memuat video publik." },
      { q: "Apakah perlu akun?", a: "Tidak. Semua tool Singkt gratis tanpa login." },
    ],
    related: ["twitter"],
    canonicalRoute: "/twitter-video-downloader",
  },
];
