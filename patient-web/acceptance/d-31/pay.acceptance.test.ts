// ACCEPTANCE — D-31 (owner decision 31, "Double taps and bad networks"): PAY on the web.
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
//
// Screens (the real components, rendered in a real DOM with the real react-dom client):
//  - pharmacy checkout pay screen      components-next/pharmacy-checkout/pay-screen.tsx (PayScreen)
//  - pharmacy offers online payment    components-next/pharmacy-offers/payment-actions.tsx (OnlinePaymentActions)
//  - consultation payment              components-next/consultation-payment-action.tsx (ConsultationPaymentAction)
//  - insurance co-pay                  components-next/insurance-copay-client.tsx (InsuranceCopayClient)
//  - insurance payment split (co-pay)  components-next/insurance-payment-split-client.tsx (InsurancePaymentSplitClient)
// Rules checked for each:
//  A1  two taps while the first request is in flight -> exactly ONE request reaches the network, and the button is
//      disabled (or the handler ignores the tap) while it is in flight ("slow 3G" = a fetch that has not answered yet);
//  A2  after a lost connection (fetch rejects with TypeError('Network request failed'): the server may have acted) the
//      next attempt sends the SAME Idempotency-Key, or the screen asks the server for the result (a status GET)
//      instead of creating a new charge; the screen shows a clear message, and the user can retry;
//  A3  after a definite server answer (a 4xx with a body) a new attempt is allowed (a new key is fine).
// Only the network boundary is faked (fetch). next/navigation (no Next router in a unit render) and next-intl (the real
// message files through tests/helpers/intl) are the same seams the existing tests use.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { button, deferred, fakeNetwork, isBusy, json, lost, messages, mount, pause, settle, tap } from "./harness";
import { expectOneWrite, expectRetryIsSafe } from "./rules";
import { createElement } from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }), usePathname: () => "/en", useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", async () => (await import("../../tests/helpers/intl")).nextIntlMock("en"));

const { PayScreen } = await import("@/components-next/pharmacy-checkout/pay-screen");
const { OnlinePaymentActions } = await import("@/components-next/pharmacy-offers/payment-actions");
const { ConsultationPaymentAction } = await import("@/components-next/consultation-payment-action");
const { InsuranceCopayClient } = await import("@/components-next/insurance-copay-client");
const { InsurancePaymentSplitClient } = await import("@/components-next/insurance-payment-split-client");

const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const APPT = "5f1b2c3d-1111-4222-8333-444455556666";
const REQ = "9a8b7c6d-1111-4222-8333-777788889999";

type Screen = {
  name: string;
  /** what the pay request looks like */
  write: RegExp;
  /** renders the screen and brings it to the point where the pay button is on screen */
  open: () => Promise<{ container: HTMLElement; unmount: () => Promise<void> }>;
  pay: (container: HTMLElement) => HTMLButtonElement;
  /** answers for the reads the screen makes on its way (capabilities, …) */
  reads?: (path: string) => Response | undefined;
};

const CAPS = { booking_id: APPT, amount: 150, currency: "SAR", purpose: "consultation_card_payment", methods: [{ id: "card", kind: "online" }] };

const SCREENS: Screen[] = [
  {
    name: "pharmacy pay screen (PayScreen)",
    write: /\/api\/payments\/pharmacy\/[^/]+\/intent$/,
    open: () => mount(createElement(PayScreen, { locale: "en", orderId: ORDER, amount: 51.5, currency: "SAR", methods: ["card"], coverage: "cash", totals: { subtotal: 41.5, deliveryFee: 10 } })),
    pay: (c) => button(c, /^Pay\b|Taking you to the secure page/),
  },
  {
    name: "pharmacy offers online payment (OnlinePaymentActions)",
    write: /\/api\/payments\/pharmacy\/[^/]+\/intent$/,
    reads: (path) => (/\/payments\/pharmacy\/[^/]+\/capabilities$/.test(path) ? json(200, { booking_id: ORDER, amount: 51.5, currency: "SAR", methods: [{ id: "card", kind: "online" }] }) : undefined),
    open: async () => {
      const view = await mount(createElement(OnlinePaymentActions, { orderId: ORDER }));
      await tap(button(view.container, /Choose a payment method/));
      await settle();
      return view;
    },
    pay: (c) => button(c, /^Bank card$|^Working…$/),
  },
  {
    name: "consultation payment (ConsultationPaymentAction)",
    write: /\/api\/appointments\/[^/]+\/payment-intent$/,
    reads: (path) => (/payment-capabilities$/.test(path) ? json(200, CAPS) : undefined),
    open: async () => {
      const view = await mount(createElement(ConsultationPaymentAction, { appointmentId: APPT }));
      await tap(button(view.container, /Show payment|payment options|Pay/i));
      await settle();
      return view;
    },
    pay: (c) => button(c, /card/i),
  },
  {
    name: "insurance co-pay (InsuranceCopayClient)",
    write: /\/api\/insurance\/requests\/[^/]+\/payment-intent$/,
    open: () => mount(createElement(InsuranceCopayClient, { requestId: REQ, dueAmount: 30, approvalCode: "NPH-1", locale: "en" })),
    pay: (c) => button(c, /Confirm payment|Processing/),
  },
  {
    name: "insurance payment split, co-pay (InsurancePaymentSplitClient)",
    write: /\/api\/insurance\/requests\/[^/]+\/payment-intent$/,
    open: () => mount(createElement(InsurancePaymentSplitClient, { requestId: REQ, action: "checkout_copay", payable: 30, bookingStatusHref: null, locale: "en" })),
    pay: (c) => button(c, /secure payment/),
  },
];

let view: { container: HTMLElement; unmount: () => Promise<void> } | null = null;
beforeEach(() => { view = null; });
afterEach(async () => {
  await view?.unmount();
  vi.unstubAllGlobals();
});

describe.each(SCREENS)("PAY — $name", (screen) => {
  it("A1: two taps on a slow network send ONE payment request, and the button is disabled while it is in flight", async () => {
    const slow = deferred();
    const net = fakeNetwork((call) => screen.reads?.(call.path) ?? (screen.write.test(call.path) ? slow.promise : undefined));
    view = await screen.open();
    const first = await tap(screen.pay(view.container));
    expect(first).toBe("clicked");
    const pay = screen.pay(view.container);
    expect(isBusy(pay), `${screen.name}: the pay button is still enabled while the payment request is in flight (label "${pay.textContent}")`).toBe(true);
    await tap(pay);
    await settle();
    expectOneWrite(screen.name, net.calls, screen.write);
    slow.resolve(json(409, { message: "payment_order_not_collectable" }));
    await settle();
  });

  it("A2: after a lost connection the retry sends the SAME Idempotency-Key (or asks the server for the result), with a clear message on screen", async () => {
    let n = 0;
    const net = fakeNetwork((call) => {
      const read = screen.reads?.(call.path);
      if (read) return read;
      if (!screen.write.test(call.path)) return undefined;
      n += 1;
      return n === 1 ? lost() : deferred().promise; // the retry stays in flight: we only look at what it sends
    });
    view = await screen.open();
    await tap(screen.pay(view.container));
    await settle();
    expect(messages(view.container).length, `${screen.name}: no message on screen after the connection was lost`).toBeGreaterThan(0);
    const retry = screen.pay(view.container);
    expect(isBusy(retry), `${screen.name}: the user cannot retry after a lost connection (button stays disabled)`).toBe(false);
    await pause(5); // a real retry comes later than the first tap
    await tap(retry);
    await settle();
    expectRetryIsSafe(screen.name, net.calls, screen.write);
  });

  it("A3: after a definite server answer (4xx with a body) the user may try again (a new key is allowed)", async () => {
    let n = 0;
    const net = fakeNetwork((call) => {
      const read = screen.reads?.(call.path);
      if (read) return read;
      if (!screen.write.test(call.path)) return undefined;
      n += 1;
      return n === 1 ? json(409, { message: "payment_order_not_collectable" }) : deferred().promise;
    });
    view = await screen.open();
    await tap(screen.pay(view.container));
    await settle();
    expect(messages(view.container).length, `${screen.name}: no message after the server refused`).toBeGreaterThan(0);
    await tap(screen.pay(view.container));
    await settle();
    expect(net.writes(screen.write).length, `${screen.name}: the second attempt after a 4xx was not sent`).toBe(2);
  });
});
