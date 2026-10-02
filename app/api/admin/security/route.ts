import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { securitySnapshot } from "@/lib/security-shield";
import { guardApiRequest } from "@/lib/api-shield";

export async function GET(req: Request) {
  const _shield = guardApiRequest(req);
  if (_shield) return _shield;
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(securitySnapshot());
}
