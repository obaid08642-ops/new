import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "@/lib/context/CartContext";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("the cart provider (local-first)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchSpy = vi.fn(() => Promise.reject(new TypeError("backend down")));
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  function Probe() {
    const { items, ready, itemCount, hasRxItems } = useCart();
    return <p data-ready={String(ready)} data-count={itemCount} data-rx={String(hasRxItems)}>{items.length}</p>;
  }

  it("is not ready on the first render (the empty state waits for the browser's own storage) and exposes no price or subtotal", () => {
    const html = renderToStaticMarkup(<CartProvider><Probe /></CartProvider>);
    expect(html).toContain('data-ready="false"');
    expect(html).toContain('data-count="0"');
    expect(fetchSpy).not.toHaveBeenCalled();
    const context = code("lib/context/CartContext.tsx");
    expect(context).not.toMatch(/subtotal|\bprice\b/);
  });

  it("the context makes no request of its own: the only call is the shared session probe, in its own module", () => {
    expect(code("lib/context/CartContext.tsx")).not.toMatch(/\bfetch\(|callPatientApi|XMLHttpRequest/);
    expect(code("lib/cart/cart-store.ts")).not.toMatch(/\bfetch\(|callPatientApi|XMLHttpRequest|from "react"/);
  });
});

describe("every sign-in and sign-out reaches the cart", () => {
  it("sign-out buttons announce the sign-out after the logout request (and also clear the SWR memory)", () => {
    for (const file of ["components-next/session-actions.tsx", "components-next/sign-out-button.tsx"]) {
      const source = code(file);
      expect(source, file).toContain("announceSignedOut()");
      expect(source, file).toContain("clearSwr()");
      expect(source.indexOf("/api/auth/logout"), file).toBeLessThan(source.indexOf("announceSignedOut()"));
    }
  });

  it("every flow that opens a session announces the sign-in once the server accepted it", () => {
    const flows: Array<[string, string]> = [
      ["components-next/login-form.tsx", "router.replace"],
      ["components-next/otp-screen.tsx", "router.replace"],
      ["components-next/social-login-buttons.tsx", "router.replace"],
      ["components-next/auth-welcome.tsx", "router.push"],
    ];
    for (const [file, navigation] of flows) {
      const source = code(file);
      expect(source, file).toContain("announceSignedIn()");
      expect(source.indexOf("announceSignedIn()"), file).toBeLessThan(source.lastIndexOf(navigation));
    }
    // google and guest sign-in are two flows in one file
    expect(code("components-next/social-login-buttons.tsx").match(/announceSignedIn\(\)/g)).toHaveLength(2);
  });

  it("the provider reacts to the sign-out event, to other tabs (storage) and to a signed-in answer", () => {
    const source = code("lib/context/CartContext.tsx");
    expect(source).toContain("SIGNED_OUT_EVENT");
    expect(source).toContain('"storage"');
    expect(source).toContain("adoptUser");
    expect(source).toContain("useSessionIdentity");
  });
});

describe("nothing puts a price in the cart", () => {
  it("add-to-cart from the product page, the product cards and the reorder picker passes no price", () => {
    const buy = code("components-next/pharmacy/product-buy.tsx");
    expect(buy).toMatch(/addItem\(\{ id, name, rx, image, slug, activeIngredient, form, strength, onlineOnly: onlineOnly === true \? true : undefined, qty \}\)/);
    const grid = code("components-next/pharmacy/product-grid.tsx");
    const call = grid.slice(grid.indexOf("addItem({"), grid.indexOf("setAdded("));
    expect(call).not.toMatch(/price/);
    expect(code("lib/pharmacy/order-view.ts")).not.toMatch(/price: 0/);
  });
});
