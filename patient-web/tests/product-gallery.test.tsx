import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue 1547: the product page's gallery, its full-screen viewer and the cart-aware buy controls.

const cart = vi.hoisted(() => ({ items: [] as Array<{ id: string; name: string; qty: number; rx: boolean }>, itemCount: 0 }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}(${Object.values(values).join(",")})` : key),
}));
vi.mock("@/lib/context/CartContext", () => ({
  useCart: () => ({ ...cart, addItem: vi.fn(), updateQty: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), hasRxItems: false, ready: true }),
}));

import {
  arrowStep,
  clampPan,
  isDoubleTap,
  isSwipeDown,
  MAX_SCALE,
  NO_ZOOM,
  pinchScale,
  slideIndex,
  slideOffset,
  toggleZoom,
  zoomAt,
} from "@/components-next/pharmacy/gallery-math";
import { ProductGallery } from "@/components-next/pharmacy/product-gallery";
import { BuyActions, BuyBar, BuyProvider } from "@/components-next/pharmacy/product-buy";

const size = { width: 400, height: 300 };

describe("gallery arithmetic", () => {
  it("finds the slide a scroll shows, left to right and right to left (negative scrollLeft)", () => {
    expect(slideIndex(0, 390, 4)).toBe(0);
    expect(slideIndex(390, 390, 4)).toBe(1);
    expect(slideIndex(-780, 390, 4)).toBe(2);
    expect(slideIndex(-200, 390, 4)).toBe(1);
    expect(slideIndex(99999, 390, 4)).toBe(3);
    expect(slideIndex(0, 0, 4)).toBe(0);
    expect(slideOffset(2, 390, false)).toBe(780);
    expect(slideOffset(2, 390, true)).toBe(-780);
    expect(slideOffset(0, 390, true)).toBe(0);
  });

  it("mirrors the arrow keys right to left", () => {
    expect(arrowStep("ArrowRight", false)).toBe(1);
    expect(arrowStep("ArrowLeft", false)).toBe(-1);
    expect(arrowStep("ArrowRight", true)).toBe(-1);
    expect(arrowStep("ArrowLeft", true)).toBe(1);
    expect(arrowStep("Enter", true)).toBe(0);
  });

  it("zooms at a point, keeps the picture covering its slide, and a double tap toggles", () => {
    const zoomed = toggleZoom(NO_ZOOM, { x: 100, y: 50 }, size);
    expect(zoomed.scale).toBe(2.5);
    // the tapped point stays under the finger: 100 - (100 - 0) * 2.5 = -150 (inside the 300 px overflow)
    expect(zoomed.x).toBe(-150);
    expect(zoomed.y).toBe(-75);
    expect(toggleZoom(zoomed, { x: 0, y: 0 }, size)).toEqual(NO_ZOOM);
    expect(clampPan({ scale: 2, x: 999, y: -999 }, size)).toEqual({ scale: 2, x: 200, y: -150 });
    expect(clampPan({ scale: 1, x: 50, y: 50 }, size)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(zoomAt(NO_ZOOM, 99, { x: 0, y: 0 }, size).scale).toBe(MAX_SCALE);
  });

  it("pinches between 1 and the maximum, tells a double tap from two taps, and a swipe down from a sideways one", () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
    expect(pinchScale(2, 100, 10)).toBe(1);
    expect(pinchScale(3, 100, 400)).toBe(MAX_SCALE);
    expect(isDoubleTap({ t: 0, x: 10, y: 10 }, { t: 200, x: 20, y: 15 })).toBe(true);
    expect(isDoubleTap({ t: 0, x: 10, y: 10 }, { t: 500, x: 10, y: 10 })).toBe(false);
    expect(isDoubleTap({ t: 0, x: 10, y: 10 }, { t: 100, x: 200, y: 10 })).toBe(false);
    expect(isDoubleTap(null, { t: 100, x: 10, y: 10 })).toBe(false);
    expect(isSwipeDown(10, 120)).toBe(true);
    expect(isSwipeDown(150, 120)).toBe(false);
    expect(isSwipeDown(0, 40)).toBe(false);
  });
});

describe("ProductGallery (server-rendered)", () => {
  const images = ["https://cdn.nabd.plus/1_img_1.webp", "https://cdn.nabd.plus/1_img_2.webp", "https://cdn.nabd.plus/1_img_3.webp"];

  it("draws a swipe strip of links to the full pictures, the counter and the closed viewer", () => {
    const html = renderToStaticMarkup(<ProductGallery name="Panadol" images={images} locale="en" />);
    for (const src of images) expect(html).toContain(`href="${src}"`);
    expect(html.match(/<li class="[^"]*slide/g)).toHaveLength(3);
    expect(html).toContain("imageCounter(1,3)");
    expect(html).toMatch(/<dialog[^>]*aria-label="Panadol"/);
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
    // the viewer's full pictures are lazy (fetched only when it shows them); only the first stage picture is a priority
    expect(html.match(/<img[^>]*class="[^"]*viewerImage[^"]*"[^>]*loading="lazy"|<img[^>]*loading="lazy"[^>]*class="[^"]*viewerImage/g)).toHaveLength(3);
    expect(html.match(/<img(?![^>]*loading="lazy")[^>]*class="[^"]*stageImage/g)).toHaveLength(1);
    expect(html).toContain("nextImage");
    expect(html).not.toContain("style=");
  });

  it("one picture: no counter, no arrows; no picture: the category icon and no viewer", () => {
    const one = renderToStaticMarkup(<ProductGallery name="Panadol" images={images.slice(0, 1)} locale="en" />);
    expect(one).not.toContain("imageCounter");
    expect(one).not.toContain("nextImage");
    const none = renderToStaticMarkup(<ProductGallery name="Panadol" images={[]} locale="en" />);
    expect(none).not.toContain("<dialog");
    expect(none).not.toContain("<a ");
  });
});

describe("buy controls follow the cart (as the app's product screen)", () => {
  const product = { id: "med-1", name: "Panadol", price: 12.5, rx: false, image: null, slug: "panadol", activeIngredient: null, form: null, strength: null };
  const render = () => renderToStaticMarkup(
    <BuyProvider locale="en" product={product}>
      <BuyActions locale="en" />
      <BuyBar locale="en" />
    </BuyProvider>,
  );

  beforeEach(() => {
    cart.items = [];
    cart.itemCount = 0;
  });

  it("not in the cart: add to cart and buy now", () => {
    const html = render();
    expect(html.match(/>addToCartCta</g)).toHaveLength(2);
    expect(html).not.toContain("inCartCta");
  });

  it("in the cart: 'in cart (n)' links to the cart, the stepper shows the cart's quantity and the total follows it", () => {
    cart.items = [{ id: "med-1", name: "Panadol", qty: 3, rx: false }];
    cart.itemCount = 3;
    const html = render();
    expect(html).not.toContain("addToCartCta");
    expect(html.match(/<a[^>]*href="\/en\/cart"[^>]*>(?:(?!<\/a>).)*inCartCta\(3\)/g)).toHaveLength(2);
    expect(html).toMatch(/aria-valuenow="3"|>3</);
    expect(html).toContain("37.50");
  });
});
