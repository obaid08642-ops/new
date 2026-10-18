import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Parity audit /wishlist: each row has remove and add-to-cart, as in the app.
describe("wishlist rows", () => {
  it("draws the two row actions beside each row", () => {
    const page = readFileSync(resolve(process.cwd(), "app/[locale]/wishlist/page.tsx"), "utf8");
    expect(page).toContain("<WishlistRowActions");
    expect(page).toContain("className={styles.rowWrap}");
  });

  it("remove uses the heart's request, and add-to-cart uses the cart with the wishlist flags", () => {
    const actions = readFileSync(resolve(process.cwd(), "components-next/pharmacy/wishlist-row-actions.tsx"), "utf8");
    expect(actions).toContain("requestWishlistToggle(itemId, true, newIdempotencyKey())");
    expect(actions).toContain("addItem({ id: itemId, name, rx, onlineOnly");
    expect(actions).toContain('t("addToCart", { name })');
  });
});
