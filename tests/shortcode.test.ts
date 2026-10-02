import { describe, expect, it } from "vitest";
import {
  CUSTOM_ALIAS_RE,
  SHORTCODE_ALPHABET,
  generateShortCode,
  generateUniqueCode,
} from "../lib/shortcode";

describe("shortcode", () => {
  it("uses unambiguous alphabet (no O/0/I/l/1)", () => {
    for (const c of ["O", "0", "I", "l", "1"]) {
      expect(SHORTCODE_ALPHABET).not.toContain(c);
    }
  });

  it("generates requested length from secure alphabet", () => {
    for (const n of [6, 7, 8]) {
      const c = generateShortCode(n);
      expect(c).toHaveLength(n);
      for (const ch of c) expect(SHORTCODE_ALPHABET).toContain(ch);
    }
  });

  it("generates unique codes (10k collision test)", async () => {
    const seen = new Set<string>();
    let collisions = 0;
    for (let i = 0; i < 10_000; i++) {
      const code = await generateUniqueCode(async (c) => seen.has(c));
      if (seen.has(code)) collisions++;
      seen.add(code);
    }
    expect(seen.size).toBe(10_000);
    expect(collisions).toBe(0);
  }, 60_000);

  it("retries on collision", async () => {
    const taken = new Set(["AAAAAAA"]);
    const code = await generateUniqueCode(async (c) => taken.has(c), 7);
    expect(code).not.toBe("AAAAAAA");
    expect(code).toHaveLength(7);
  });

  it("validates custom alias rules + reserved handled by config", () => {
    expect(CUSTOM_ALIAS_RE.test("promo")).toBe(true);
    expect(CUSTOM_ALIAS_RE.test("my-link_99")).toBe(true);
    expect(CUSTOM_ALIAS_RE.test("ab")).toBe(false); // min 3
    expect(CUSTOM_ALIAS_RE.test("a".repeat(31))).toBe(false); // max 30
    expect(CUSTOM_ALIAS_RE.test("has space")).toBe(false);
    expect(CUSTOM_ALIAS_RE.test("semi;colon")).toBe(false);
  });
});
