import { randomBytes } from "node:crypto";

// Unambiguous alphabet: no O/0, I/l/1
export const SHORTCODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateShortCode(length = 7): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORTCODE_ALPHABET[bytes[i] % SHORTCODE_ALPHABET.length];
  }
  return out;
}

/** Generate with collision retry. `exists` checks DB. Length grows on repeated collision. */
export async function generateUniqueCode(
  exists: (code: string) => Promise<boolean>,
  baseLength = 7,
  maxAttempts = 5
): Promise<string> {
  let length = baseLength;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateShortCode(length);
    if (!(await exists(code))) return code;
    if (attempt >= 2) length += 1;
  }
  // Final fallback with longer code
  for (let i = 0; i < 5; i++) {
    const code = generateShortCode(length + 1);
    if (!(await exists(code))) return code;
  }
  throw new Error("Failed to generate unique short code");
}

export const CUSTOM_ALIAS_RE = /^[A-Za-z0-9_-]{3,30}$/;
