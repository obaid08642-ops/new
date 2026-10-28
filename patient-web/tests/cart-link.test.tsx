import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { createCartStore, type StorageLike } from "@/lib/cart/cart-store";
import en from "@/messages/en.json";

let count = 0;
let path = "/en/c";
let basketLines: Record<"lab" | "radiology" | "nursing", unknown[]> = { lab: [], radiology: [], nursing: [] };
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ itemCount: count }) }));
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("@/components-next/ordering/use-basket", () => ({ useBasket: () => ({ basket: basketLines }) }));
vi.mock("next/link", () => ({ default: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as never}</a> }));

import { CartLink } from "@/components-next/core/cart-link";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const render = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ CoreShell: en.CoreShell }}><CartLink locale="en" /></NextIntlClientProvider>,
  );

describe("the shared cart button", () => {
  it("shows the icon without a badge when empty and a count with an accessible label otherwise", () => {
    path = "/en/c";
    count = 0;
    expect(render()).not.toContain("cart-badge");
    count = 3;
    const html = render();
    expect(html).toContain('data-testid="cart-badge"');
    expect(html).toContain('aria-label="Cart (3)"');
  });

  it("is the one cart button of the core shell (every phone header); the home header carries it too (owner, 2026-10-27)", () => {
    const core = read("components-next/core/core-shell.tsx");
    expect(core).toContain("<CartLink");
    expect(core).not.toMatch(/hideTabs && !search \? cartLink/);
    expect(read("components-next/home/home-shell.tsx")).toContain("<CartLink");
  });
});

describe("one cart per service: the header button", () => {
  const reset = () => { count = 0; basketLines = { lab: [], radiology: [], nursing: [] }; };
  it("on a pharmacy page it opens the pharmacy cart and counts only the pharmacy cart", () => {
    reset(); path = "/en/c/vitamins"; count = 2; basketLines = { lab: [{}, {}, {}], radiology: [], nursing: [] };
    const html = render();
    expect(html).toContain('href="/en/cart"');
    expect(html).toContain('aria-label="Cart (2)"');
  });
  it("on a labs page it opens the labs basket and counts only the labs basket", () => {
    reset(); path = "/en/diagnostics"; count = 5; basketLines = { lab: [{}, {}, {}], radiology: [], nursing: [] };
    const html = render();
    expect(html).toContain('href="/en/labs/basket"');
    expect(html).toContain('aria-label="Cart (3)"');
  });
  it("on a radiology page it opens the radiology basket, and on a nursing page the nursing basket", () => {
    reset(); path = "/en/diagnostics/radiology"; basketLines = { lab: [{}], radiology: [{}, {}], nursing: [{}] };
    expect(render()).toContain('href="/en/labs/basket?kind=radiology"');
    expect(render()).toContain('aria-label="Cart (2)"');
    path = "/en/nursing/catalog";
    expect(render()).toContain('href="/en/labs/basket?kind=nursing"');
    expect(render()).toContain('aria-label="Cart (1)"');
  });
  it("on Home, the doctor profile, consultations and the account there is no cart button while every cart is empty", () => {
    for (const p of ["/en", "/en/doctor/dr-test", "/en/consultations/doctors", "/en/profile", "/en/pharmacy/final-quote"]) {
      reset(); path = p;
      expect(render(), p).toBe("");
    }
  });
  it("on those pages with items in any cart it shows a popup button with the total badge, closed at first", () => {
    for (const p of ["/en", "/en/doctor/dr-test", "/en/consultations/doctors", "/en/profile"]) {
      reset(); path = p; count = 3; basketLines = { lab: [{}], radiology: [], nursing: [{}] };
      const html = render();
      expect(html, p).toContain('aria-haspopup="true"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-label="Cart (5)"');
      expect(html).not.toContain("cart-chooser");
    }
  });
  it("the chooser is titled 'Your carts', lists a name and count per cart, closes on Escape and outside click, and uses tokens only", () => {
    expect(en.CoreShell.cartChooser).toBe("Your carts");
    const src = read("components-next/core/cart-sheet.tsx");
    expect(src).toContain('event.key === "Escape"');
    expect(src).toContain("pointerdown");
    expect(src).toContain("href={cart.href}");
    expect(src).not.toContain("style=");
  });
  it("the sheet is a separate chunk, fetched on the first open only: the button file does not import it statically", async () => {
    const link = read("components-next/core/cart-link.tsx");
    expect(link).toContain('import("./cart-sheet")');
    expect(link).not.toMatch(/^import .* from "\.\/cart-sheet"/m);
    expect(link).not.toContain("createPortal");
    expect(read("components-next/core/core.module.css")).not.toContain("cartMenu");
    expect(read("components-next/core/cart-sheet.module.css")).toContain("max-width: 767px");
    // the lazy chunk resolves to the sheet component
    const mod = await import("@/components-next/core/cart-sheet");
    expect(typeof mod.default).toBe("function");
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ CoreShell: en.CoreShell }}>
        <mod.default locale="en" carts={[{ service: "lab", href: "/en/labs/basket", count: 2 }]} wrap={{ current: null }} button={{ current: null }} onClose={() => {}} onId={() => {}} />
      </NextIntlClientProvider>,
    );
    expect(html).toContain('data-testid="cart-chooser"');
    expect(html).toContain("Your carts");
    expect(html).toContain('href="/en/labs/basket"');
  });
});

describe("the count the button reads updates in the same tick", () => {
  it("add then remove notifies subscribers at once with the new count", () => {
    const data = new Map<string, string>();
    const storage: StorageLike = {
      get length() { return data.size; },
      key: (i) => [...data.keys()][i] ?? null,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => { data.set(k, v); },
      removeItem: (k) => { data.delete(k); },
    };
    const store = createCartStore(() => storage);
    store.load();
    const seen: number[] = [];
    const total = () => store.getSnapshot().items.reduce((n, i) => n + i.qty, 0);
    store.subscribe(() => seen.push(total()));
    store.add({ id: "p1", name: "A", rx: false });
    store.add({ id: "p1", name: "A", rx: false });
    expect(total()).toBe(2);
    store.remove("p1");
    expect(total()).toBe(0);
    expect(seen[seen.length - 1]).toBe(0);
    expect(seen).toContain(2);
  });
});
