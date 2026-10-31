import { describe, expect, it } from "vitest";
import { cartHref, cartTarget, serviceOfPath, type CartCounts } from "./service-carts";

const counts = (c: Partial<CartCounts>): CartCounts => ({ pharmacy: 0, lab: 0, radiology: 0, nursing: 0, ...c });

describe("which service a page belongs to", () => {
  it.each([
    ["/ar/c", "pharmacy"], ["/en/c/vitamins", "pharmacy"], ["/en/p/panadol", "pharmacy"],
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
    expect(cartTarget("radiology", counts({ pharmacy: 2, radiology: 1, lab: 2 }), "ar")).toEqual({
      kind: "chooser", count: 3, carts: [{ service: "lab", href: "/ar/labs/basket", count: 2 }, { service: "radiology", href: "/ar/labs/basket?kind=radiology", count: 1 }],
    });
    expect(cartTarget("lab", counts({ radiology: 4 }), "en")).toMatchObject({ kind: "chooser", count: 4, carts: [{ service: "radiology" }] });
    expect(cartTarget("lab", counts({ pharmacy: 2 }), "en")).toMatchObject({ kind: "cart", service: "lab", count: 0, href: "/en/labs/basket" });
  });
  it("on Home and on pages where nothing can be added there is no cart button while every cart is empty", () => {
    expect(cartTarget(null, counts({}), "en")).toEqual({ kind: "none" });
  });
  it("on those pages with any non-empty cart the chooser lists only the non-empty carts with counts, the badge is the total", () => {
    expect(cartTarget(null, counts({ pharmacy: 3, nursing: 1 }), "en")).toEqual({
      kind: "chooser", count: 4,
      carts: [{ service: "pharmacy", href: "/en/cart", count: 3 }, { service: "nursing", href: "/en/labs/basket?kind=nursing", count: 1 }],
    });
    expect(cartTarget(null, counts({ lab: 2 }), "ar")).toEqual({ kind: "chooser", count: 2, carts: [{ service: "lab", href: "/ar/labs/basket", count: 2 }] });
  });
  it("the pharmacy order flow and the cart page itself have none", () => {
    for (const path of ["/en/pharmacy/final-quote", "/ar/pharmacy/payment", "/en/pharmacy/broadcast-status", "/en/cart", "/en/doctor/dr-test", "/en/consultations/doctors"]) expect(serviceOfPath(path), path).toBeNull();
    expect(serviceOfPath("/en/pharmacy")).toBe("pharmacy");
  });
  it("the hrefs differ per service", () => {
    expect(new Set(["pharmacy", "lab", "radiology", "nursing"].map((x) => cartHref(x as never, "en"))).size).toBe(4);
  });
});
