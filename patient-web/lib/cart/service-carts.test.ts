import { describe, expect, it } from "vitest";
import { cartHref, cartTarget, nonEmptyCarts, serviceOfPath, type CartCounts } from "./service-carts";

const counts = (c: Partial<CartCounts>): CartCounts => ({ pharmacy: 0, lab: 0, radiology: 0, nursing: 0, ...c });

describe("which service a page belongs to", () => {
  it.each([
    ["/ar/c", "pharmacy"], ["/en/c/vitamins", "pharmacy"], ["/en/p/panadol", "pharmacy"], ["/en/cart", "pharmacy"],
    ["/en/diagnostics", "lab"], ["/en/diagnostics/packages", "lab"], ["/en/diagnostics/radiology", "radiology"],
    ["/en/nursing/catalog", "nursing"], ["/en/home-care", "nursing"],
  ])("%s -> %s", (path, service) => expect(serviceOfPath(path)).toBe(service));
  it("Home and the pages of no service have none", () => {
    for (const path of ["/en", "/ar", "/en/dashboard", "/en/profile", "/en/search"]) expect(serviceOfPath(path), path).toBeNull();
  });
  it("the basket page takes its service from its kind", () => {
    expect(serviceOfPath("/en/labs/basket")).toBe("lab");
    expect(serviceOfPath("/en/labs/basket", "radiology")).toBe("radiology");
    expect(serviceOfPath("/en/labs/basket", "nursing")).toBe("nursing");
  });
});

describe("one cart per service: the header button", () => {
  it("on a service page it opens that service's cart and shows only that service's count", () => {
    const t = cartTarget("pharmacy", counts({ pharmacy: 2, lab: 5 }), "en");
    expect(t).toEqual({ kind: "cart", service: "pharmacy", href: "/en/cart", count: 2 });
    expect(cartTarget("radiology", counts({ pharmacy: 2, radiology: 1 }), "ar")).toEqual({ kind: "cart", service: "radiology", href: "/ar/labs/basket?kind=radiology", count: 1 });
    expect(cartTarget("lab", counts({ pharmacy: 2 }), "en")).toMatchObject({ service: "lab", count: 0, href: "/en/labs/basket" });
  });
  it("on Home with two or more non-empty carts it offers the chooser, each with its own count", () => {
    const t = cartTarget(null, counts({ pharmacy: 3, nursing: 1 }), "en");
    expect(t.kind).toBe("chooser");
    if (t.kind === "chooser") {
      expect(t.carts).toEqual([
        { service: "pharmacy", count: 3, href: "/en/cart" },
        { service: "nursing", count: 1, href: "/en/labs/basket?kind=nursing" },
      ]);
      expect(t.count).toBe(4);
    }
  });
  it("on Home with one non-empty cart it opens that cart; with none it opens the pharmacy cart", () => {
    expect(cartTarget(null, counts({ lab: 2 }), "en")).toEqual({ kind: "cart", service: "lab", href: "/en/labs/basket", count: 2 });
    expect(cartTarget(null, counts({}), "en")).toEqual({ kind: "cart", service: "pharmacy", href: "/en/cart", count: 0 });
  });
  it("lists the non-empty carts in a fixed order and the hrefs differ per service", () => {
    expect(nonEmptyCarts(counts({ nursing: 1, pharmacy: 1 })).map((c) => c.service)).toEqual(["pharmacy", "nursing"]);
    expect(new Set(["pharmacy", "lab", "radiology", "nursing"].map((s) => cartHref(s as never, "en"))).size).toBe(4);
  });
});
