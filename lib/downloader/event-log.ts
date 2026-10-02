import { prisma } from "@/lib/db";

/**
 * Persistent extraction/download event log (no IPs stored — privacy first).
 * Every function is failure-safe: logging must never break downloads.
 */

export async function logExtraction(input: {
  platform: string;
  originalUrl: string;
  resolvedUrl: string;
  status: string;
}): Promise<number | null> {
  try {
    const row = await prisma.extractionLog.create({
      data: {
        platform: input.platform.slice(0, 32),
        originalUrl: input.originalUrl.slice(0, 2048),
        resolvedUrl: input.resolvedUrl.slice(0, 2048),
        status: input.status.slice(0, 32),
      },
    });
    return row.id;
  } catch {
    return null;
  }
}

export async function markAdCompleted(logId: number | null, quality: string): Promise<void> {
  if (!logId) return;
  try {
    await prisma.extractionLog.update({
      where: { id: logId },
      data: { adCompleted: true, quality: quality.slice(0, 32) },
    });
  } catch {
    // ignore — logging only
  }
}

export async function markDownloadStarted(logId: number | null, quality: string): Promise<void> {
  if (!logId) return;
  try {
    await prisma.extractionLog.update({
      where: { id: logId },
      data: { downloadStarted: true, quality: quality.slice(0, 32) },
    });
  } catch {
    // ignore — logging only
  }
}
