import { NextResponse } from "next/server";
import {
  BLOCK_CODE,
  BLOCK_MESSAGE,
  blockIp,
  isBlocked,
  noteRequest,
  noteShieldEvent,
  scoreRequest,
  shieldDisabled,
} from "@/lib/security-shield";
import { clientKeyFromHeaders } from "@/lib/rate-limit";

/**
 * Route-level shield (server bundle — shares state with the dashboard).
 * Call at the top of every /api handler:
 *   const blocked = guardApiRequest(req);
 *   if (blocked) return blocked;
 * Returns a 403 SECURITY_BLOCKED response, or null to continue.
 * Suspicious (non-blocking) traffic is logged for /admin/security.
 */
export function guardApiRequest(req: Request): NextResponse | null {
  if (shieldDisabled()) return null;
  const url = new URL(req.url);
  const path = url.pathname;
  const ip = clientKeyFromHeaders(req.headers);
  noteRequest(path);
  if (isBlocked(ip)) {
    return NextResponse.json(
      { success: false, message: BLOCK_MESSAGE, code: BLOCK_CODE },
      { status: 403 }
    );
  }
  const { score, reasons } = scoreRequest({
    path,
    query: url.search,
    userAgent: req.headers.get("user-agent"),
  });
  if (score >= 100) {
    blockIp(ip);
    noteShieldEvent({ ip, path, score, action: "block", reasons });
    return NextResponse.json(
      { success: false, message: BLOCK_MESSAGE, code: BLOCK_CODE },
      { status: 403 }
    );
  }
  if (score >= 50) {
    noteShieldEvent({ ip, path, score, action: "monitor", reasons });
  } else if (score > 0) {
    noteShieldEvent({ ip, path, score, action: "allow", reasons });
  }
  return null;
}
