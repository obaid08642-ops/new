import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The order exists before the card payment page opens, so its tests leave the cart first (they are not kept for a retry).
describe("diagnostics checkout: the cart is cleared before the card payment page", () => {
  it("clears the cart before it sends the reader to checkout_url", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/diagnostics-checkout-form.tsx"), "utf8");
    const clear = source.indexOf("await clearCart();\n          window.location.href = checkoutUrl;");
    expect(clear).toBeGreaterThan(-1);
    expect(source).toContain('localStorage.removeItem("nabd-diagnostics-cart")');
    expect(source).toContain('fetch("/api/diagnostics/cart", { method: "DELETE" })');
  });
});
