# Singkt — deploy di VPS (Docker)

Singkt butuh **server persisten** (VPS). Jangan deploy ke serverless
(Vercel dkk): ekstraktor butuh binary `yt-dlp` + `ffmpeg`, mux butuh file
sementara, SQLite butuh file yang bisa ditulis, dan rate-limit/reward
disimpan di memori.

## Yang dibutuhkan

- Docker di VPS
- Domain yang mengarah ke VPS (untuk `APP_URL`)

## Cara jalan

```bash
cp .env.example .env
# Edit .env: APP_URL=https://domain-anda, ADMIN_TOKEN=<acak-panjang>,
#           REWARD_SECRET=<acak-panjang>, TRUST_PROXY=true
docker build -t singkat .
docker run -d --name singkat -p 3000:3000 \
  --env-file .env \
  -v singkat-data:/app/data \
  --restart unless-stopped \
  singkat
```

> Catatan: `DATABASE_URL` default `file:./dev.db` menulis di dalam
> container. Untuk persistensi lewat volume, set
> `DATABASE_URL="file:/app/data/prod.db"`.

## Cek kesehatan

```bash
curl http://localhost:3000/api/health
# {"ok":true,"ytdlp":{"ok":true,...},"ffmpeg":{"ok":true},"db":{"ok":true}}
```

## Tanpa Docker

Butuh: Node 20 LTS, `python3` + `yt-dlp`, `ffmpeg`, lalu:

```bash
npm ci
npx prisma db push
npm run build
npm start
```
