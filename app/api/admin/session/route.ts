import { NextResponse } from "next/server";
import { destroyAdminSession, isAdminRequest } from "@/lib/admin-auth";
import { guardApiRequest } from "@/lib/api-shield";

export async function POST(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const cookie = req.headers.get("cookie");
  const m = cookie?.match(/(?:^|;\s*)singkat_admin=([^;]+)/);
  if (m) {
    try {
      destroyAdminSession(decodeURIComponent(m[1]));
    } catch {
      // ignore
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("singkat_admin", "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  if (!isAdminRequest(req.headers.get("cookie"))) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  return NextResponse.json({ authed: true });
}
