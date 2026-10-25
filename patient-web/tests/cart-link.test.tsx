import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { createCartStore, type StorageLike } from "@/lib/cart/cart-store";
import en from "@/messages/en.json";

let count = 0;
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ itemCount: count }) }));
vi.mock("next/link", () => ({ default: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as never}</a> }));

import { CartLink } from "@/components-next/core/cart-link";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const render = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ CoreShell: en.CoreShell }}><CartLink locale="en" /></NextIntlClientProvider>,
  );

describe("the shared cart button", () => {
  it("shows the icon without a badge when empty and a count with an accessible label otherwise", () => {
    count = 0;
    expect(render()).not.toContain("cart-badge");
    count = 3;
    const html = render();
    expect(html).toContain('data-testid="cart-badge"');
    expect(html).toContain('aria-label="Cart (3)"');
  });

  it("is the one cart button of the core shell (every phone header) and of the home header", () => {
    const core = read("components-next/core/core-shell.tsx");
    expect(core).toContain("<CartLink");
    expect(core).not.toMatch(/hideTabs && !search \? cartLink/);
    expect(read("components-next/home/home-shell.tsx")).toContain("<CartLink");
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
