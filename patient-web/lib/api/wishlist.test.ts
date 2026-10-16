import { describe, expect, it } from "vitest";
import { extractWishlist, parseWishlistItemId } from "./wishlist";

describe("wishlist parser", () => {
  it("keeps bounded product fields and ignores malformed rows", () => {
    expect(extractWishlist({ data: [{ id: "med-1", name_ar: "دواء", name_en: "Medicine", price: 12.5, in_stock: true, private_note: "drop" }, { id: "" }] })).toEqual([{ id: "med-1", nameAr: "دواء", nameEn: "Medicine", price: 12.5, inStock: true }]);
  });
  it("reads requires_prescription and online_exclusive (decision 11)", () => {
    expect(extractWishlist([{ id: "med-2", requires_prescription: true, online_exclusive: true }, { id: "med-3", online_exclusive: false }])).toEqual([
      { id: "med-2", requiresPrescription: true, onlineOnly: true },
      { id: "med-3", onlineOnly: false },
    ]);
  });
  it("validates item identifiers", () => {
    expect(parseWishlistItemId("med-1").success).toBe(true);
    expect(parseWishlistItemId("../private").success).toBe(false);
  });
});
