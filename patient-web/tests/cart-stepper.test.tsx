import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCartStore, type StorageLike } from "@/lib/cart/cart-store";

let cartItems: Array<{ id: string; qty: number }> = [];
vi.mock("@/lib/context/CartContext", () => ({
  useCart: () => ({ items: cartItems, addItem: vi.fn(), removeItem: vi.fn(), updateQty: vi.fn() }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
}));

import { AddToCartButton } from "@/components-next/pharmacy/add-to-cart-button";
import { MOTION, reducedMotion } from "@/lib/motion/motion";
import { flyToCart } from "@/lib/motion/fly-to-cart";

const line = { id: "p1", name: "Panadol", rx: false, image: null, slug: "panadol", form: null, strength: null };
const render = () => renderToStaticMarkup(<AddToCartButton line={line} addLabel="add" announce="added" />);

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
  };
}

describe("the card's add button becomes a stepper", () => {
  it("is the + square while the product is not in the cart", () => {
    cartItems = [];
    const html = render();
    expect(html).toContain('aria-label="add"');
    expect(html).not.toContain("cart-stepper");
  });

  it("is [- qty +] with the cart store's quantity once it is in the cart (the same number on every card)", () => {
    cartItems = [{ id: "p1", qty: 3 }, { id: "p2", qty: 9 }];
    const html = render();
    expect(html).toContain('data-testid="cart-stepper"');
    expect(html).toContain('data-testid="cart-stepper-qty">3<');
    expect(html).toContain('aria-label="stepperDecrease:Panadol"');
    expect(html).toContain('aria-label="stepperIncrease:Panadol"');
    expect(html).toContain('aria-label="qtyInCart:3"');
  });

  it("an unpriced (disabled) product never shows a stepper", () => {
    cartItems = [{ id: "p1", qty: 2 }];
    expect(renderToStaticMarkup(<AddToCartButton line={line} addLabel="add" announce="added" disabled />)).not.toContain("cart-stepper");
  });
});

describe("the quantity belongs to the store: it follows the steps and survives a reload", () => {
  it("+ adds one, - at 1 removes the line, undo puts it back, and a new store over the same storage has the same quantity", () => {
    const storage = memoryStorage();
    const store = createCartStore(() => storage);
    store.load();
    const qtyOf = (s: ReturnType<typeof createCartStore>) => s.getSnapshot().items.find((i) => i.id === "p1")?.qty ?? 0;
    store.add({ id: "p1", name: "Panadol", rx: false, qty: 1 });
    store.update("p1", 1);
    expect(qtyOf(store)).toBe(2);
    store.update("p1", -1);
    expect(qtyOf(store)).toBe(1);
    store.remove("p1");
    expect(qtyOf(store)).toBe(0);
    store.add({ id: "p1", name: "Panadol", rx: false, qty: 1 }); // undo
    store.update("p1", 1);
    const reloaded = createCartStore(() => storage);
    reloaded.load();
    expect(qtyOf(reloaded)).toBe(2);
  });
});

describe("the motion rules", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("flight is 300 to 450 ms, ease-out", () => {
    expect(MOTION.flight).toBeGreaterThanOrEqual(300);
    expect(MOTION.flight).toBeLessThanOrEqual(450);
    expect(MOTION.ease).toContain("cubic-bezier");
  });

  it("with prefers-reduced-motion nothing is created or animated", () => {
    const created: string[] = [];
    const animate = vi.fn();
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }), setTimeout });
    vi.stubGlobal("document", { createElement: (tag: string) => { created.push(tag); return {}; }, querySelector: () => ({ animate }) });
    expect(reducedMotion()).toBe(true);
    flyToCart({ closest: () => null } as unknown as HTMLElement);
    expect(created).toEqual([]);
    expect(animate).not.toHaveBeenCalled();
  });

  it("without it, a copy of the picture flies to the cart icon and the badge pops", () => {
    vi.useFakeTimers();
    const flights: unknown[] = [];
    const appended: unknown[] = [];
    const cartIcon = { getBoundingClientRect: () => ({ left: 300, top: 10, width: 44, height: 44 }) };
    const badge = { animate: vi.fn() };
    const picture = { currentSrc: "https://x.test/p.png", getBoundingClientRect: () => ({ left: 20, top: 200, width: 120, height: 120 }) };
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), setTimeout: globalThis.setTimeout.bind(globalThis) });
    vi.stubGlobal("document", {
      createElement: () => ({ style: {}, setAttribute: vi.fn(), animate: (frames: unknown, options: unknown) => { flights.push({ frames, options }); return {}; }, remove: vi.fn() }),
      body: { appendChild: (el: unknown) => appended.push(el) },
      querySelector: (selector: string) => (selector.includes("cart-link") ? cartIcon : selector.includes("cart-badge") ? badge : null),
    });
    flyToCart({ closest: () => ({ querySelector: () => picture }) } as unknown as HTMLElement);
    expect(appended).toHaveLength(1);
    expect(flights).toHaveLength(1);
    expect((flights[0] as { options: { duration: number } }).options.duration).toBe(MOTION.flight);
    vi.advanceTimersByTime(100);
    expect(badge.animate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
