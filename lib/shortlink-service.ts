import { prisma } from "@/lib/db";
import { RESERVED_ROUTES, shortUrlOf } from "@/lib/config";
import { CUSTOM_ALIAS_RE, generateUniqueCode } from "@/lib/shortcode";
import { validateDestinationUrl } from "@/lib/url-security";
import { expiryToDate } from "@/lib/utils";

export type CreateInput = {
  url: string;
  customAlias?: string;
  expiresIn?: "none" | "1d" | "7d" | "30d" | "90d";
};

export type CreateResult =
  | { ok: true; shortCode: string; shortUrl: string; expiresAt: Date | null }
  | { ok: false; status: number; error: string };

/** Blocklist matches the exact host or any subdomain (jahat.com ⇒ www.jahat.com). */
export function domainMatchesBlocked(host: string, domains: string[]): boolean {
  const h = host.toLowerCase();
  return domains.some((d) => {
    const dom = d.toLowerCase();
    return h === dom || h.endsWith(`.${dom}`);
  });
}

export async function blockedReason(host: string): Promise<string | null> {
  try {
    const domains = await prisma.blockedDomain.findMany({ select: { domain: true } });
    if (domainMatchesBlocked(host, domains.map((d) => d.domain))) {
      return "URL tidak dapat disingkat. Domain tersebut diblokir.";
    }
  } catch {
    // ignore — fail open, redirect-time check is the backstop
  }
  return null;
}

/** Shared shortlink creation used by /api/shorten and /api/shortlink/create. */
export async function createShortLink(input: CreateInput): Promise<CreateResult> {
  const check = await validateDestinationUrl(input.url);
  if (!check.ok) return { ok: false, status: 400, error: check.error };

  try {
    const host = new URL(check.url).hostname.toLowerCase();
    const reason = await blockedReason(host);
    if (reason) return { ok: false, status: 400, error: reason };
  } catch {
    // ignore — URL already validated
  }

  const expiresAt = expiryToDate(input.expiresIn ?? "none");
  const alias = (input.customAlias ?? "").trim();

  if (alias) {
    if (!CUSTOM_ALIAS_RE.test(alias)) {
      return {
        ok: false,
        status: 400,
        error: "Alias harus 3–30 karakter: huruf, angka, - dan _.",
      };
    }
    if (RESERVED_ROUTES.has(alias.toLowerCase())) {
      return { ok: false, status: 409, error: "Alias tersebut tidak tersedia (reserved)." };
    }
    const clash =
      (await prisma.shortLink.findUnique({ where: { shortCode: alias } })) ??
      (await prisma.shortLink.findUnique({ where: { customAlias: alias } }));
    if (clash) {
      return { ok: false, status: 409, error: "Alias sudah digunakan. Pilih yang lain." };
    }
    let created;
    try {
      created = await prisma.shortLink.create({
        data: { shortCode: alias, customAlias: alias, destination: check.url, expiresAt },
      });
    } catch (e) {
      // Alias race: check-then-create lost to a concurrent insert.
      if (isUniqueError(e)) {
        return { ok: false, status: 409, error: "Alias sudah digunakan. Pilih yang lain." };
      }
      throw e;
    }
    return {
      ok: true,
      shortCode: created.shortCode,
      shortUrl: shortUrlOf(created.shortCode),
      expiresAt: created.expiresAt,
    };
  }

  const code = await generateUniqueCode(async (c) => {
    const row = await prisma.shortLink.findUnique({ where: { shortCode: c } });
    return !!row;
  });
  try {
    const created = await prisma.shortLink.create({
      data: { shortCode: code, destination: check.url, expiresAt },
    });
    return {
      ok: true,
      shortCode: created.shortCode,
      shortUrl: shortUrlOf(created.shortCode),
      expiresAt: created.expiresAt,
    };
  } catch (e) {
    if (isUniqueError(e)) {
      return { ok: false, status: 409, error: "Kode bentrok, silakan coba lagi." };
    }
    throw e;
  }
}

function isUniqueError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}
