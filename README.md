# Singkt — deploy di VPS (Docker)

Singkat butuh **server persisten** (VPS). Jangan deploy ke serverless
(Vercel, Cloudflare Workers/Pages, dkk): ekstraktor butuh binary `yt-dlp` +
`ffmpeg`, mux butuh file sementara, SQLite butuh file yang bisa ditulis, dan
rate-limit/reward disimpan di memori.

## 1. Yang dibutuhkan

- VPS Ubuntu 22.04/24.04, RAM min 2 GB
- Domain dengan A record mengarah ke IP VPS (untuk `APP_URL`)
- Akses SSH ke VPS

## 2. Install Docker (di VPS)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit
# login ulang via SSH, lalu cek:
docker --version
```

## 3. Clone repo + isi `.env` (di VPS)

```bash
sudo mkdir -p /opt/singkat && sudo chown $USER:$USER /opt/singkat
git clone <URL_REPO> /opt/singkat && cd /opt/singkat
cp .env.example .env
openssl rand -hex 32   # jalankan 2x: untuk ADMIN_TOKEN & REWARD_SECRET
nano .env
```

Wajib di `.env`:

```
APP_URL=https://www.singkt.my.id/
ADMIN_TOKEN=<hasil-openssl-pertama, min 32 char, beda dengan bawah>
REWARD_SECRET=<hasil-openssl-kedua>
TRUST_PROXY=true
DATABASE_URL="file:/app/data/prod.db"
```

- `TRUST_PROXY=true` karena berjalan di belakang reverse proxy (Caddy/nginx/Cloudflare).
- `DATABASE_URL="file:/app/data/prod.db"` agar SQLite ikut volume Docker dan tidak hilang saat container di-recreate.
- Jangan commit `.env` ke git.

## 4. Build & jalankan (di VPS)

```bash
docker build -t singkat:latest .
docker run -d --name singkat \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  -v singkat-data:/app/data \
  --restart unless-stopped \
  singkat:latest
docker logs -f singkat   # Ctrl+C setelah tidak ada error
```

`yt-dlp` + `ffmpeg` sudah termasuk di image — tidak perlu install manual.

## 5. Reverse proxy + HTTPS (di VPS)

Hanya expose via proxy, jangan buka port 3000 ke publik. Contoh dengan Caddy (HTTPS otomatis):

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

```
domain-anda {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

> Pastikan DNS domain sudah mengarah ke VPS sebelum langkah ini, kalau tidak sertifikat gagal terbit. Cloudflare boleh dipakai sebagai DNS/CDN di depan VPS.

## 6. Cek kesehatan

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s https://domain-anda/api/health
# {"ok":true,"ytdlp":{"ok":true,...},"ffmpeg":{"ok":true},"db":{"ok":true}}
```

Jika `ok: false`, lihat flag `ytdlp`/`ffmpeg`/`db` mana yang gagal lalu perbaiki — jangan anggap selesai sebelum `ok: true`.

## 7. Update berikutnya

```bash
cd /opt/singkat && git pull
docker build -t singkat:latest .
docker stop singkat && docker rm singkat
docker run -d --name singkat \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  -v singkat-data:/app/data \
  --restart unless-stopped \
  singkat:latest
```

Data aman di volume `singkat-data`.

## Tanpa Docker

Butuh: Node 20 LTS, `python3` + `yt-dlp` (`pip install yt-dlp`), `ffmpeg`, lalu:

```bash
npm ci
npx prisma db push
npm run build
npm start
```
