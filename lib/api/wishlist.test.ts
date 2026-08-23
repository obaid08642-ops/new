import { describe, expect, it } from "vitest";
import { extractWishlist, parseWishlistItemId } from "./wishlist";

describe("wishlist parser", () => {
  it("keeps bounded product fields and ignores malformed rows", () => {
    expect(extractWishlist({ data: [{ id: "med-1", name_ar: "دواء", name_en: "Medicine", price: 12.5, in_stock: true, private_note: "drop" }, { id: "" }] })).toEqual([{ id: "med-1", nameAr: "دواء", nameEn: "Medicine", price: 12.5, inStock: true }]);
  });
  it("validates item identifiers", () => {
    expect(parseWishlistItemId("med-1").success).toBe(true);
    expect(parseWishlistItemId("../private").success).toBe(false);
  });
});
