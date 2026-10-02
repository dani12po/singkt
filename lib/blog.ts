export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  paragraphs: string[];
  steps: { t: string; d: string }[];
  faqs: BlogFaq[];
  related: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "cara-download-video-facebook",
    title: "Cara Download Video Facebook (HP & Laptop)",
    description:
      "Panduan lengkap download video Facebook di HP dan laptop lewat link — gratis tanpa aplikasi tambahan.",
    date: "2026-09-01",
    tags: ["facebook", "tutorial", "video"],
    paragraphs: [
      "Download video Facebook sebenarnya sederhana: Anda hanya butuh link videonya. Buka aplikasi atau situs Facebook, ketuk tombol Bagikan pada video, lalu pilih Salin Tautan.",
      "Tempel tautan itu ke tool Facebook Downloader Singkt, tekan Download, dan pilih kualitas yang tersedia — misalnya 720p HD bila videonya mendukung. File tersimpan langsung ke perangkat Anda.",
      "Metode ini bekerja untuk video publik, reel, dan siaran watch. Video privat atau grup tertutup tidak bisa diproses karena membutuhkan login — dan Singkt tidak akan pernah meminta kredensial Anda.",
      "Tips: jika unduhan kualitas tinggi meminta rewarded ad, tonton 30 detik untuk membukanya. Kualitas 360p/480p selalu gratis langsung.",
    ],
    steps: [
      { t: "Salin link", d: "Ketuk Bagikan → Salin Tautan pada video Facebook." },
      { t: "Tempel", d: "Paste ke Facebook Downloader Singkt." },
      { t: "Pilih kualitas", d: "Pilih resolusi yang tersedia." },
      { t: "Simpan", d: "Tekan Download dan simpan file." },
    ],
    faqs: [
      { q: "Apakah perlu aplikasi tambahan?", a: "Tidak. Cukup browser dan link videonya." },
      { q: "Bisa download video grup privat?", a: "Tidak. Konten yang butuh login tidak didukung." },
      { q: "Format file apa yang didapat?", a: "MP4 dengan audio, hasil merge server bila sumbernya terpisah." },
    ],
    related: ["cara-download-facebook-reel-hd", "cara-download-mp3-dari-video"],
  },
  {
    slug: "cara-download-facebook-reel-hd",
    title: "Cara Download Facebook Reel HD",
    description:
      "Download reel Facebook kualitas HD beserta audio lewat link — langkah mudah tanpa watermark tambahan.",
    date: "2026-09-03",
    tags: ["facebook", "reel", "hd"],
    paragraphs: [
      "Reel Facebook menyimpan video dan audio secara terpisah di servernya. Downloader yang bagus harus menggabungkan keduanya — persis yang dilakukan Singkt lewat mux server-side.",
      "Salin link reel (Bagikan → Salin Tautan), tempel ke Facebook Downloader, dan pilih kualitas tertinggi yang muncul, misalnya 720p HD. Hasilnya satu file MP4 dengan suara.",
      "Daftar kualitas hanya menampilkan resolusi yang benar-benar ada. Reel vertikal 720x1280 tampil sebagai 720p — bukan 1280p palsu.",
    ],
    steps: [
      { t: "Salin link reel", d: "Bagikan → Salin Tautan dari reel." },
      { t: "Tempel", d: "Paste ke Facebook Downloader." },
      { t: "Pilih HD", d: "Pilih kualitas tertinggi yang tersedia." },
    ],
    faqs: [
      { q: "Apakah hasilnya ada suaranya?", a: "Ya. Video dan audio digabung di server menjadi satu MP4." },
      { q: "Kenapa hanya ada 360p?", a: "Karena sumbernya memang hanya menyediakan itu — kami tidak membuat resolusi palsu." },
    ],
    related: ["cara-download-video-facebook", "cara-download-instagram-reel"],
  },
  {
    slug: "cara-download-youtube-shorts",
    title: "Cara Download YouTube Shorts",
    description:
      "Simpan YouTube Shorts favorit ke HP atau laptop lewat link — lengkap dengan pilihan audio saja.",
    date: "2026-09-05",
    tags: ["youtube", "shorts", "tutorial"],
    paragraphs: [
      "YouTube Shorts memakai pola link /shorts/ atau youtu.be. Salin link-nya lewat tombol Bagikan di aplikasi YouTube.",
      "Tempel ke YouTube Downloader Singkt. Anda akan melihat info video, thumbnail, serta pilihan video dan trek audio yang tersedia.",
      "Butuh lagunya saja? Buka tab Audio Only dan unduh trek audio dalam format aslinya. Unduhan stream video penuh tidak ditawarkan — kami tidak mengakali proteksi YouTube.",
    ],
    steps: [
      { t: "Salin link Shorts", d: "Bagikan → Salin link dari aplikasi YouTube." },
      { t: "Tempel", d: "Paste ke YouTube Downloader." },
      { t: "Unduh", d: "Simpan thumbnail/info, atau trek audio yang tersedia." },
    ],
    faqs: [
      { q: "Bisa download video Shorts-nya?", a: "Unduhan stream video tidak ditawarkan; yang tersedia adalah info, thumbnail, dan trek audio." },
      { q: "Apakah legal?", a: "Gunakan hanya untuk konten milik sendiri atau yang lisensinya mengizinkan." },
    ],
    related: ["cara-download-mp3-dari-video", "cara-download-video-facebook"],
  },
  {
    slug: "cara-download-mp3-dari-video",
    title: "Cara Download MP3 dari Video",
    description:
      "Ambil trek audio (MP3/M4A) dari link video atau file langsung — panduan kualitas 64–320kbps.",
    date: "2026-09-07",
    tags: ["mp3", "audio", "tutorial"],
    paragraphs: [
      "Banyak video menyimpan trek audio terpisah. Tool Singkt menampilkannya di tab Audio Only lengkap dengan label bitrate asli — 64, 128, hingga 320kbps bila tersedia.",
      "Untuk file audio langsung (.mp3/.m4a/.ogg), gunakan Audio Downloader: tempel URL, pratinjau, unduh. Tanpa konversi — file dikirim apa adanya sehingga kualitasnya persis seperti sumber.",
      "Aturan main: audio ≤128kbps gratis langsung; di atas itu dibuka lewat rewarded ad 30 detik.",
    ],
    steps: [
      { t: "Tempel link", d: "Link video atau URL audio langsung." },
      { t: "Buka tab Audio", d: "Lihat daftar bitrate yang tersedia." },
      { t: "Unduh", d: "Pilih dan simpan file audio." },
    ],
    faqs: [
      { q: "Apakah ini hasil konversi YouTube ke MP3?", a: "Bukan. Hanya trek audio yang memang tersedia yang ditawarkan." },
      { q: "Format apa yang didapat?", a: "Format asli sumber: MP3, M4A, WebA, atau Opus." },
    ],
    related: ["cara-download-youtube-shorts", "cara-download-tiktok-tanpa-watermark"],
  },
  {
    slug: "cara-download-instagram-reel",
    title: "Cara Download Instagram Reel",
    description:
      "Panduan menyimpan reel Instagram publik lewat link — kenali batasnya agar tidak buang waktu.",
    date: "2026-09-09",
    tags: ["instagram", "reel", "tutorial"],
    paragraphs: [
      "Salin link reel dari menu titik tiga di aplikasi Instagram, lalu tempel ke Instagram Downloader Singkt.",
      "Penting untuk diketahui: Instagram menutup akses tanpa login untuk sebagian besar konten. Jika reel-nya publik dan didukung metode saat ini, Anda akan melihat hasilnya; jika tidak, halaman menampilkan alasan yang jujur — bukan spinner tanpa akhir.",
      "Jangan pernah memasukkan username/password Instagram ke situs downloader mana pun, termasuk Singkt (kami tidak memintanya).",
    ],
    steps: [
      { t: "Salin link reel", d: "Menu ⋯ → Salin Tautan." },
      { t: "Tempel", d: "Paste ke Instagram Downloader." },
      { t: "Ikuti hasil", d: "Unduh bila tersedia, atau baca alasannya." },
    ],
    faqs: [
      { q: "Kenapa reel saya tidak bisa diproses?", a: "Kemungkinan privat, dihapus, atau butuh login — ketiganya di luar metode yang didukung." },
      { q: "Apakah akun saya aman?", a: "Ya, tool ini tidak meminta kredensial apa pun." },
    ],
    related: ["cara-download-facebook-reel-hd", "cara-download-tiktok-tanpa-watermark"],
  },
  {
    slug: "cara-download-tiktok-tanpa-watermark",
    title: "Cara Download TikTok Tanpa Watermark",
    description:
      "Penjelasan jujur soal unduhan TikTok tanpa watermark: kapan bisa, kapan tidak, dan cara yang aman.",
    date: "2026-09-11",
    tags: ["tiktok", "tutorial", "tanpa-watermark"],
    paragraphs: [
      "Banyak situs mengklaim 'tanpa watermark' untuk semua video — kenyataannya tergantung ketersediaan stream dari TikTok saat itu. Singkt hanya menampilkan file yang benar-benar bisa diambil.",
      "Caranya sama: salin link video (Bagikan → Salin Tautan), tempel ke TikTok Downloader. Bila stream video tersedia, tombol download muncul; bila tidak, Anda tetap mendapat info video dan thumbnail-nya.",
      "Hindari situs yang meminta login TikTok atau menginstal aplikasi mencurigakan demi menghilangkan watermark.",
    ],
    steps: [
      { t: "Salin link", d: "Bagikan → Salin Tautan di TikTok." },
      { t: "Tempel", d: "Paste ke TikTok Downloader." },
      { t: "Unduh yang ada", d: "Simpan file yang tersedia." },
    ],
    faqs: [
      { q: "Apakah selalu tanpa watermark?", a: "Tidak selalu — tergantung stream yang disediakan TikTok. Kami menampilkan yang tersedia." },
      { q: "Video privat bisa?", a: "Tidak. Hanya video publik yang bisa diproses." },
    ],
    related: ["cara-download-instagram-reel", "cara-download-mp3-dari-video"],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
