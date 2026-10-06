import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), requirePatientAccess: vi.fn(), getOptionalPatientAccessToken: vi.fn() }));
const nav = vi.hoisted(() => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next/navigation", () => nav);
vi.mock("next-intl/server", () => ({ getTranslations: async (namespace: string | { namespace: string }) => (key: string) => `${typeof namespace === "string" ? namespace : namespace.namespace}.${key}`, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess, getOptionalPatientAccessToken: state.getOptionalPatientAccessToken }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("@/components-next/pharmacy/cart-screen", () => ({ CartScreen: () => null }));
vi.mock("@/components-next/pharmacy-checkout/checkout-screen", () => ({ CheckoutScreen: () => null }));
import CartPage from "./page";
import CartCheckoutPage from "./checkout/page";

type CartScreenElement = { props: Record<string, unknown> };

describe("cart SSR boundary", () => {
  beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-only-cart-token"); state.getOptionalPatientAccessToken.mockReset().mockResolvedValue("server-only-cart-token"); state.callPatientApi.mockReset(); });

  it("makes no backend call at all: the cart is the browser's, and the screen gets no server cart, price or total", async () => {
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(state.callPatientApi).not.toHaveBeenCalled();
    expect(element.props).toEqual({ locale: "en", signedIn: true });
    expect(JSON.stringify(element.props)).not.toContain("server-only-cart-token");
  });

  it("is open to a guest: no token means a guest cart screen, still without a call", async () => {
    state.getOptionalPatientAccessToken.mockResolvedValue(undefined);
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(state.callPatientApi).not.toHaveBeenCalled();
    expect(element.props).toEqual({ locale: "en", signedIn: false });
  });

  it("still opens with the backend down: the page never depends on it", async () => {
    state.callPatientApi.mockRejectedValue(new Error("backend down"));
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(element.props).toEqual({ locale: "en", signedIn: true });
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("checkout sends the browser cart: it asks for a session and does not read the server cart or draw its totals", async () => {
    const element = (await CartCheckoutPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) })) as unknown as { props: { locale: string } };
    expect(state.requirePatientAccess).toHaveBeenCalledWith("en");
    expect(state.callPatientApi).not.toHaveBeenCalled();
    expect(element.props.locale).toBe("en");
  });

  it("an old checkout link with a prescription goes to the screen that orders a prescription", async () => {
    nav.redirect.mockClear();
    await CartCheckoutPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ prescriptionId: "91047ef2-ad36-422a-a184-629693e7c729" }) });
    expect(nav.redirect).toHaveBeenCalledWith("/en/pharmacy/rx-order?prescriptionId=91047ef2-ad36-422a-a184-629693e7c729");
  });

  it("a malformed prescription id is a not-found page, never forwarded", async () => {
    nav.redirect.mockClear();
    nav.notFound.mockClear();
    nav.notFound.mockImplementationOnce(() => { throw new Error("NEXT_NOT_FOUND"); }); // the real one throws, which ends the page
    await expect(CartCheckoutPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ prescriptionId: "../../x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(nav.notFound).toHaveBeenCalled();
    expect(nav.redirect).not.toHaveBeenCalled();
  });
});
