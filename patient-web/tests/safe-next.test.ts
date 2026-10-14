import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath (journey 1: back to the checkout after sign-in)", () => {
  it("keeps a page of this site, with its query", () => {
    expect(safeNextPath("/ar/cart/checkout")).toBe("/ar/cart/checkout");
    expect(safeNextPath("/ur/consultations/book/d1?type=video")).toBe("/ur/consultations/book/d1?type=video");
  });
  it("refuses anything that could leave the site", () => {
    for (const bad of ["https://evil.example/ar", "//evil.example/ar/x", "/\\evil.example", "javascript:alert(1)", "/ar:x/y", "ar/cart", "", null, undefined, "/xx/cart"]) {
      expect(safeNextPath(bad as string)).toBeNull();
    }
  });
  it("never sends the patient back to a sign-in page", () => {
    expect(safeNextPath("/ar/login")).toBeNull();
    expect(safeNextPath("/en/register?x=1")).toBeNull();
  });
});
