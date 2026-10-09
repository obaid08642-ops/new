// ACCEPTANCE — D-31 (owner decision 31, "Double taps and bad networks"): SEND (pharmacy order broadcast) and the
// OFFLINE cart on the web.
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
//
// Screens (the real components with the REAL cart provider and this browser's real localStorage, in a real DOM):
//  - checkout / send to pharmacies   components-next/pharmacy-checkout/checkout-screen.tsx (CheckoutScreen, with
//                                    lib/pharmacy/broadcast.ts createBroadcastAttempt + lib/pharmacy/send-cart.ts)
//  - cart                            components-next/pharmacy/cart-screen.tsx (CartScreen) + lib/context/CartContext.tsx
// Rules checked:
//  A1  two taps on Send while the order request is in flight ("slow 3G") -> ONE create request reaches the network,
//      and the button is disabled while it is in flight;
//  A2  after a lost connection the retry sends the SAME Idempotency-Key (no second order), with a clear message;
//  A3  after a definite server answer (4xx) a new attempt is allowed;
//  B   offline (navigator.onLine=false + 'offline' event, every fetch fails): the cart works locally (add / change qty /
//      remove), is kept in this browser and comes back after a reload; Send shows a clear error and leaves the cart
//      exactly as it was.
// Only the network boundary is faked (fetch, navigator.onLine). next/navigation and next-intl are the seams the
// existing tests use.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { button, deferred, fakeNetwork, isBusy, json, lost, messages, mount, pause, setOnline, settle, tap, text, win } from "./harness";
import { expectOneWrite, expectRetryIsSafe } from "./rules";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }), usePathname: () => "/en", useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", async () => (await import("../../tests/helpers/intl")).nextIntlMock("en"));

const { CartProvider } = await import("@/lib/context/CartContext");
const { CheckoutScreen } = await import("@/components-next/pharmacy-checkout/checkout-screen");
const { CartScreen } = await import("@/components-next/pharmacy/cart-screen");
const { GUEST_CART_KEY } = await import("@/lib/cart/cart-store");

const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const LINES = [{ id: "m1", name: "Paracetamol 500", qty: 2, rx: false }, { id: "m2", name: "Vitamin D", qty: 1, rx: false }];
const ADDRESSES = [{ id: "a1", label: "Home", street: "12 King Fahd Rd", city: "Riyadh", district: "Olaya", lat: 24.7, lng: 46.7, is_default: true }];
const CREATE = /^\/api\/patient\/patient\/pharmacy\/orders$/;

const stored = () => JSON.parse(win.localStorage.getItem(GUEST_CART_KEY) ?? "[]") as Array<{ id: string; qty: number }>;
const seed = () => win.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(LINES));

let view: { container: HTMLElement; unmount: () => Promise<void> } | null = null;
beforeEach(() => {
  win.localStorage.clear();
  setOnline(true);
});
afterEach(async () => {
  await view?.unmount();
  view = null;
  setOnline(true);
});

/** The reads the checkout makes on its way: who is signed in, and the saved delivery address. */
function reads(path: string) {
  if (path === "/api/auth/session") return json(200, { authenticated: false });
  if (path === "/api/patient/users/me/addresses") return json(200, ADDRESSES);
  return undefined;
}

async function openCheckout() {
  seed();
  view = await mount(createElement(CartProvider, null, createElement(CheckoutScreen, { locale: "en" })));
  await settle(10);
  const send = button(view.container, /^Send request to pharmacies$|^Sending…$/);
  expect(isBusy(send), `setup: the Send button never became enabled (messages: ${messages(view.container).join(" | ")})`).toBe(false);
  return view;
}

const sendButton = (c: HTMLElement) => button(c, /^Send request to pharmacies$|^Sending…$/);

describe("SEND — pharmacy order broadcast (CheckoutScreen)", () => {
  it("A1: two taps on a slow network create ONE order, and the button is disabled while it is in flight", async () => {
    const slow = deferred();
    const net = fakeNetwork((call) => (call.method === "GET" ? reads(call.path) : CREATE.test(call.path) ? slow.promise : undefined));
    const { container } = await openCheckout();
    await tap(sendButton(container));
    const send = sendButton(container);
    expect(isBusy(send), `the Send button is still enabled while the order request is in flight (label "${send.textContent}")`).toBe(true);
    await tap(send);
    await settle();
    expectOneWrite("pharmacy send", net.calls, CREATE);
    slow.resolve(json(400, { message: "items_required" }));
    await settle();
  });

  it("A2 + B: after a lost connection: a clear message, the cart is unchanged, and the retry sends the SAME Idempotency-Key", async () => {
    let n = 0;
    const net = fakeNetwork((call) => {
      if (call.method === "GET") return reads(call.path);
      if (CREATE.test(call.path)) return ++n === 1 ? lost() : deferred().promise;
      return undefined;
    });
    const { container } = await openCheckout();
    await tap(sendButton(container));
    await settle();
    expect(messages(container).some((m) => /could not be reached|connection/i.test(m)), `no clear connection message; messages: ${messages(container).join(" | ")}`).toBe(true);
    expect(stored()).toEqual(LINES);
    expect(text(container)).toContain("Paracetamol 500");
    await pause(5);
    await tap(sendButton(container));
    await settle();
    expectRetryIsSafe("pharmacy send", net.calls, CREATE);
  });

  it("A3: after a definite server answer (4xx) the patient may send again (a new key is allowed)", async () => {
    let n = 0;
    const net = fakeNetwork((call) => {
      if (call.method === "GET") return reads(call.path);
      if (CREATE.test(call.path)) return ++n === 1 ? json(400, { message: "items_required" }) : deferred().promise;
      return undefined;
    });
    const { container } = await openCheckout();
    await tap(sendButton(container));
    await settle();
    expect(messages(container).length).toBeGreaterThan(0);
    await tap(sendButton(container));
    await settle();
    expect(net.writes(CREATE).length, "the second send after a 4xx was not sent").toBe(2);
  });

  it("B: offline, Send shows a clear error and the cart stays exactly as it was (on screen and in this browser)", async () => {
    const net = fakeNetwork((call) => (call.method === "GET" ? reads(call.path) : lost()));
    const { container } = await openCheckout();
    setOnline(false);
    net.calls.length = 0;
    await tap(sendButton(container));
    await settle();
    expect(messages(container).length, "no error shown when sending offline").toBeGreaterThan(0);
    expect(stored()).toEqual(LINES);
    expect(text(container)).toContain("Paracetamol 500");
    expect(text(container)).toContain("Vitamin D");
    expect(isBusy(sendButton(container)), "Send stays disabled after the offline failure: the patient cannot retry").toBe(false);
  });
});

describe("OFFLINE CART (CartScreen + the real CartProvider)", () => {
  it("B: add / change / remove work with the backend unreachable and offline, are kept in this browser, and survive a reload", async () => {
    const net = fakeNetwork(() => lost());
    setOnline(false);
    seed();
    view = await mount(createElement(CartProvider, null, createElement(CartScreen, { locale: "en", signedIn: false })));
    await settle(10);
    const c = view.container;
    expect(text(c)).toContain("Paracetamol 500");

    await tap(button(c, "Increase the quantity of Paracetamol 500"));
    await tap(button(c, "Increase the quantity of Paracetamol 500"));
    await tap(button(c, "Decrease the quantity of Paracetamol 500"));
    await settle();
    const afterChange = stored();
    expect(afterChange.find((l) => l.id === "m1")?.qty, "the quantity change was not kept in this browser").toBe(3);

    // the decrement of a qty-1 line removes it
    await tap(button(c, "Remove Vitamin D from the cart"));
    await settle();
    expect(stored().map((l) => l.id), "removing a line did not reach this browser's cart").toEqual(["m1"]);

    // no cart request reached the network (only the shared session probe is allowed)
    expect(net.calls.filter((call) => call.path !== "/api/auth/session").map((call) => `${call.method} ${call.path}`)).toEqual([]);

    await view.unmount();
    view = await mount(createElement(CartProvider, null, createElement(CartScreen, { locale: "en", signedIn: false })));
    await settle(10);
    expect(text(view.container)).toContain("Paracetamol 500");
    expect(text(view.container)).not.toContain("Vitamin D");
    expect(stored()).toEqual([expect.objectContaining({ id: "m1", qty: 3 })]);
  });
});
