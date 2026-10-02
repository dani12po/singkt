# SINGKAT on a VPS with Docker.
# Serverless hosting (Vercel, etc.) is NOT supported: yt-dlp/ffmpeg
# binaries, temp files for muxing, SQLite file writes, and in-memory
# rate-limit/reward state all require a persistent server.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg ca-certificates \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["sh", "-c", "npx prisma db push && node node_modules/next/dist/bin/next start -p ${PORT:-3000}"]
