import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Parity audit /cart: every line has its own remove button (aria "Remove {name} from the cart"), as in the app.
describe("cart: remove one line", () => {
  it("draws a remove button on every line that clears it", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/pharmacy/cart-screen.tsx"), "utf8");
    expect(source).toContain('aria-label={t("remove", { name: item.name })} onClick={() => changeQty(item, 0)}');
    expect(source).toContain('icon="trash"');
  });

  it("the label exists in all six languages", () => {
    for (const loc of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${loc}.json`), "utf8"));
      expect(String(messages.CartScreen.remove ?? "").trim(), loc).not.toBe("");
    }
  });
});
