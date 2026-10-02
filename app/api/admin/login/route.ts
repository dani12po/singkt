import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminToken } from "@/lib/admin-auth";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { guardApiRequest } from "@/lib/api-shield";

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const ip = clientKeyFromHeaders(req.headers);
  const rl = checkRateLimit(`admin-login:${ip}`, { max: 5, windowMs: 900000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
      { status: 429 }
    );
  }
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (!body.token || !verifyAdminToken(body.token)) {
    return NextResponse.json({ error: "Token salah." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const useSecure =
    (process.env.APP_URL ?? "").startsWith("https://") &&
    process.env.NODE_ENV === "production";
  // Opaque session id — never the raw admin token.
  res.cookies.set("singkat_admin", createAdminSession(), {
    httpOnly: true,
    secure: useSecure,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
