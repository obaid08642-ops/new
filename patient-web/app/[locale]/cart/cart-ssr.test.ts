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

type CartScreenElement = { props: { locale: string; signedIn: boolean; account: { groups: Array<{ items: Array<Record<string, unknown>> }>; total?: number } | null; accountFailed: boolean } };

describe("cart SSR boundary", () => {
  beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue("server-only-cart-token"); state.getOptionalPatientAccessToken.mockReset().mockResolvedValue("server-only-cart-token"); state.callPatientApi.mockReset(); });

  it("hands the screen only bounded account-cart fields, never the token or a line's private metadata", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ patient_id: "private-patient", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", name_en: "Medicine EN", qty: 2, price: 6, notes: "private-notes", meta: { private: true } }] }], subtotal: 12, total: 12, currency: "SAR" }), { status: 200 }));
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart", {}, "server-only-cart-token");
    expect(element.props.signedIn).toBe(true);
    expect(element.props.account?.groups[0].items[0]).toEqual({ lineId: "line-1", name: "Medicine", nameEn: "Medicine EN", quantity: 2, price: 6 });
    const serialised = JSON.stringify(element.props);
    for (const secret of ["server-only-cart-token", "private-patient", "private-notes", "private", "med-1"]) expect(serialised).not.toContain(secret);
  });

  it("is open to a guest: no token means no call to the server cart and the browser cart is all there is", async () => {
    state.getOptionalPatientAccessToken.mockResolvedValue(undefined);
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(state.callPatientApi).not.toHaveBeenCalled();
    expect(element.props).toMatchObject({ signedIn: false, account: null, accountFailed: false });
  });

  it("treats an expired session (401) as a guest, not as an error", async () => {
    state.callPatientApi.mockResolvedValue(new Response(null, { status: 401 }));
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(element.props).toMatchObject({ signedIn: false, account: null, accountFailed: false });
  });

  it("says so when the account cart cannot be read, and does not invent an empty one", async () => {
    state.callPatientApi.mockResolvedValue(new Response(null, { status: 503 }));
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(element.props).toMatchObject({ signedIn: true, account: null, accountFailed: true });
  });

  it("keeps a missing price missing: no zero amount is made up for a line without one", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ groups: [{ kind: "pharmacy", items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine" }] }], currency: "SAR" }), { status: 200 }));
    const element = (await CartPage({ params: Promise.resolve({ locale: "en" }) })) as unknown as CartScreenElement;
    expect(element.props.account?.groups[0].items[0].price).toBeUndefined();
    expect(element.props.account?.groups[0].items[0].quantity).toBeUndefined();
    expect(element.props.account?.total).toBeUndefined();
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
