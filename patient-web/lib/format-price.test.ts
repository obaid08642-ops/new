import { describe, expect, it } from "vitest";
import ur from "../messages/ur.json";
import { formatPrice } from "./format-price";

describe("formatPrice in Urdu (owner 2026-10-10: the riyal is the symbol, never the code)", () => {
  it("writes the amount and the symbol, with no code", () => {
    const price = formatPrice("ur", 24.5);
    expect(price.currency).toBe("ر.س");
    expect(price.amount).toMatch(/24[.٫]50/);
    expect(price.text).toBe(`${price.amount} ر.س`);
    expect(price.text).not.toMatch(/SAR|ریال/);
  });

  it("keeps two decimals and groups thousands in the locale's own way", () => {
    expect(formatPrice("ur", 1234).amount).toMatch(/1[,٬]234[.٫]00/);
    expect(formatPrice("ur", 0).text).toMatch(/^0[.٫]00 ر\.س$/);
  });

  it("a regional Urdu locale gets the symbol too", () => {
    expect(formatPrice("ur-PK", 10).currency).toBe("ر.س");
  });

  it("other languages are unchanged: the locale's own Intl currency format", () => {
    for (const locale of ["ar", "en", "hi", "bn", "fil"]) {
      const expected = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(24.5);
      expect(formatPrice(locale, 24.5).text).toBe(expected);
    }
    expect(formatPrice("en", 24.5).text).toMatch(/SAR/);
  });
});

describe("the Urdu message file writes the riyal as the symbol everywhere", () => {
  const values: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") values.push(node);
    else if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(ur);

  it("has no riyal word and no SAR code in any text", () => {
    expect(values.filter((v) => /ریال|\bSAR\b/.test(v))).toEqual([]);
  });

  it("price strings put the amount before the symbol", () => {
    expect(values.filter((v) => /^\{(value|amount)\} ر\.س$/.test(v)).length).toBeGreaterThan(3);
  });
});
