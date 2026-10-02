import dns from "node:dns/promises";
import net from "node:net";

const DANGEROUS_SCHEMES = ["javascript:", "data:", "file:", "vbscript:"];

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255))
    return false;
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fe80:") || v.startsWith("fec0:")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
  if (v.startsWith("::ffff:")) {
    const rest = v.slice("::ffff:".length);
    if (net.isIPv4(rest)) return isPrivateIPv4(rest);
  }
  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return false;
}

const LOCAL_NAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "instance-data",
]);

/**
 * TEST-ONLY escape hatch for local mock-server tests (vitest).
 * Active only when SINGKAT_ALLOW_PRIVATE=1 AND NODE_ENV=test.
 * NEVER enable in any other environment — it disables SSRF protection.
 */
export function allowPrivateForTests(): boolean {
  return process.env.SINGKAT_ALLOW_PRIVATE === "1" && process.env.NODE_ENV === "test";
}

export async function validateDestinationUrl(
  raw: string,
  opts: { resolveDns?: boolean } = {}
): Promise<UrlCheck> {
  const input = raw.trim();
  if (!input) return { ok: false, error: "URL tidak boleh kosong." };
  if (input.length > 2048) return { ok: false, error: "URL terlalu panjang." };

  const lower = input.toLowerCase();
  for (const s of DANGEROUS_SCHEMES) {
    if (lower.startsWith(s))
      return { ok: false, error: `Skema URL "${s}" tidak diizinkan.` };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: "URL tidak valid." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Hanya URL http:// dan https:// yang didukung." };
  }

  // Reject credential URLs: https://user:pass@host
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: "URL dengan kredensial (username:password@) tidak diizinkan.",
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  if (!hostname) return { ok: false, error: "Hostname tidak valid." };
  if (LOCAL_NAMES.has(hostname))
    return { ok: false, error: "URL internal tidak diizinkan." };
  if (hostname.endsWith(".internal") || hostname.endsWith(".local"))
    return { ok: false, error: "URL jaringan internal tidak diizinkan." };

  // Literal IP check (strip brackets for v6)
  const literal = hostname.replace(/^\[(.*)\]$/, "$1");
  if (net.isIP(literal)) {
    if (isPrivateIP(literal) && !allowPrivateForTests())
      return { ok: false, error: "URL ke alamat IP privat/internal tidak diizinkan." };
  } else if (opts.resolveDns !== false) {
    // DNS → SSRF check, best effort with short timeout
    try {
      const addrs = await Promise.race([
        dns.lookup(hostname, { all: true }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("dns-timeout")), 2500)
        ),
      ]);
      for (const a of addrs as { address: string }[]) {
        if (isPrivateIP(a.address) && !allowPrivateForTests())
          return {
            ok: false,
            error: "Domain tersebut mengarah ke alamat internal. Tidak diizinkan.",
          };
      }
    } catch {
      // Fail-open on DNS errors (offline NXDOMAIN etc.) except when the
      // hostname itself is suspicious — literal checks above already ran.
    }
  }

  // Safe normalization: keep destination intact, only normalize trivial parts
  // (URL constructor already normalizes). Do not alter path/query semantics.
  return { ok: true, url: parsed.toString() };
}
