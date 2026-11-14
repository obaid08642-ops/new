import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Parity audit /medicines/compare: the cheapest price is marked with the app's "lowest" label.
describe("medicines compare: the lowest price", () => {
  it("marks the cheapest price only when two medicines have prices", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/medicines/compare/page.tsx"), "utf8");
    expect(source).toContain("prices.length >= 2 ? Math.min(...prices) : null");
    expect(source).toContain('getTranslations("PharmacyOffers")');
    expect(source).toContain('f === "price" && cheapest !== null && m.price === cheapest');
  });

  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s has the lowest-price label", (loc) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), "utf8"));
    expect(String(messages.PharmacyOffers.lowestPrice ?? "").trim()).not.toBe("");
  });
});
