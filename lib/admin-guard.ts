import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/** Returns a 401 JSON response when not admin, else null. */
export function requireAdmin(req: Request): NextResponse | null {
  const cookie = req.headers.get("cookie");
  if (isAdminRequest(cookie)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
