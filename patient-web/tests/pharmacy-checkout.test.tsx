import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cart = vi.hoisted(() => ({
  value: { items: [] as unknown[], ready: true, updateQty: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), addItem: vi.fn(), itemCount: 0, hasRxItems: false },
}));
const server = vi.hoisted(() => ({ order: vi.fn(), caps: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }), redirect: server.redirect, notFound: server.notFound }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));
vi.mock("next-intl/server", async () => {
  const helper = await import("./helpers/intl");
  return { getTranslations: async (arg: string | { locale?: string; namespace?: string }) => helper.createTranslator("en", typeof arg === "string" ? arg : arg.namespace), setRequestLocale: vi.fn() };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, footer, title }: { children: ReactNode; footer?: ReactNode; title?: string }) => <div data-shell data-title={title}>{children}{footer}</div>,
}));
vi.mock("@/lib/context/CartContext", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/context/CartContext")>()), useCart: () => cart.value }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/components-next/pharmacy-checkout/read-order", () => ({ readOrderPaymentView: server.order, readCapabilities: server.caps }));

import { CheckoutScreen } from "@/components-next/pharmacy-checkout/checkout-screen";
import { checkPayment, PaymentResult } from "@/components-next/pharmacy-checkout/payment-result";
import { PayScreen } from "@/components-next/pharmacy-checkout/pay-screen";
import { PaymentScreen } from "@/components-next/pharmacy-checkout/payment-screen";
import { InsuranceDecision } from "@/components-next/pharmacy-offers/insurance-decision";
import { classifyError } from "@/components-next/pharmacy-offers/use-pharmacy-action";
import { transactionIdOf, checkoutUrlOf } from "@/lib/api/pharmacy-payment";
import { extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";
import { buildBroadcastBody, createBroadcastAttempt, type BroadcastRequest, type BroadcastResult } from "@/lib/pharmacy/broadcast";
import { activePrescriptionId, parseInsurancePolicy } from "@/lib/pharmacy/checkout-support";
import { routeForOrder } from "@/lib/pharmacy/order-route";
import { forgetPayment, recallPayment, rememberPayment } from "@/lib/pharmacy/payment-return";
import { capabilitiesFrom, needsCapabilities, outcomeOfTransactionStatus, paymentPageState, parseOrderPaymentView, parseVerification, type OrderPaymentView } from "@/lib/pharmacy/payment-state";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
// Intl puts a no-break space between the currency and the amount
const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/\u00a0/g, " ");
const ORDER = "761e9693-e517-4ad6-ae20-330363005b28";
const TXN = "91047ef2-ad36-422a-a184-629693e7c729";
const located = { id: "a1", label: "Home", street: "12 King Fahd Rd", city: "Riyadh", district: "Olaya", lat: 24.7, lng: 46.7, isDefault: true };
const item = (over: Record<string, unknown> = {}) => ({ id: "m1", name: "Paracetamol 500", qty: 2, rx: false, ...over });

describe("which screen the payment page shows (the order's own state plus the server's capabilities)", () => {
  const view = (over: Partial<OrderPaymentView>): OrderPaymentView => ({ ...over });
  const ok = (amount = 51.5, methods: Array<"card" | "apple-pay" | "google-pay"> = ["card", "apple-pay"]) => ({ status: "ok" as const, amount, currency: "SAR", methods });

  it("paid is only ever the server's word: payment_status paid", () => {
    expect(paymentPageState(view({ paymentStatus: "paid", governedState: "FINAL_QUOTE_ACCEPTED" }), ok())).toEqual({ kind: "paid" });
    expect(paymentPageState(view({ governedState: "FINAL_QUOTE_ACCEPTED", paymentStatus: "pending" }), ok()).kind).toBe("payable");
  });

  it("a payable order shows the SERVER's amount and methods, untouched", () => {
    expect(paymentPageState(view({ governedState: "FINAL_QUOTE_ACCEPTED", totals: { total: 99 } }), ok(51.5))).toEqual({ kind: "payable", amount: 51.5, currency: "SAR", methods: ["card", "apple-pay"] });
  });

  it("every step before payment sends the patient to that step instead of showing a pay button", () => {
    expect(paymentPageState(view({}), null).kind).toBe("noQuote");
    expect(paymentPageState(view({ governedState: "OFFER_SELECTED" }), null).kind).toBe("acceptFirst");
    expect(paymentPageState(view({ governedState: "FINAL_QUOTE_READY" }), null).kind).toBe("acceptFirst");
    expect(paymentPageState(view({ governedState: "INSURANCE_PROCESSING" }), null).kind).toBe("insuranceFirst");
    expect(paymentPageState(view({ governedState: "COD_REGISTERED" }), null).kind).toBe("cod");
    expect(paymentPageState(view({ governedState: "CANCELLED" }), null).kind).toBe("closed");
    expect(paymentPageState(view({ governedState: "OFFER_SELECTED", status: "expired" }), null).kind).toBe("closed");
    expect(paymentPageState(view({ governedState: "CONFIRMED", coverageMode: "insurance", insurance: { decision: "APPROVED_FULL" } }), null).kind).toBe("covered");
    expect(paymentPageState(view({ governedState: "CONFIRMED", paymentStatus: "covered_by_insurance" }), null).kind).toBe("covered");
    expect(paymentPageState(view({ governedState: "IN_FULFILLMENT" }), null).kind).toBe("fulfilment");
  });

  it("a refusal from the capabilities is read by its reason, and anything else is an honest 'unavailable'", () => {
    const decision = view({ governedState: "INSURANCE_DECISION_READY" });
    expect(paymentPageState(decision, { status: "refused", code: "copay_acceptance_required" }).kind).toBe("insuranceFirst");
    expect(paymentPageState(decision, { status: "refused", code: "insurance_rejected_acceptance_required" }).kind).toBe("insuranceFirst");
    expect(paymentPageState(decision, { status: "refused", code: "something_new" })).toEqual({ kind: "unavailable", reason: "refused" });
    expect(paymentPageState(decision, { status: "error" })).toEqual({ kind: "unavailable", reason: "error" });
    expect(paymentPageState(decision, ok(12.5, []))).toEqual({ kind: "unavailable", reason: "noMethods" });
  });

  it("asks the server for an amount only at a step where one can be due", () => {
    expect(needsCapabilities(view({ governedState: "FINAL_QUOTE_ACCEPTED" }))).toBe(true);
    expect(needsCapabilities(view({ governedState: "INSURANCE_DECISION_READY" }))).toBe(true);
    expect(needsCapabilities(view({ governedState: "FINAL_QUOTE_ACCEPTED", paymentStatus: "paid" }))).toBe(false);
    expect(needsCapabilities(view({ governedState: "FINAL_QUOTE_ACCEPTED", status: "cancelled" }))).toBe(false);
    expect(needsCapabilities(view({ governedState: "OFFER_SELECTED" }))).toBe(false);
  });

  it("reads the order the backend sends: totals from the accepted snapshot, insurance from its summary", () => {
    const parsed = parseOrderPaymentView({
      status: "cash_card_payment_pending", governed_state: "FINAL_QUOTE_ACCEPTED", coverage_mode: "cash", payment_status: "paid",
      accepted_quote_snapshot: { totals: { subtotal: 46.5, delivery_fee: 5, total: 51.5, currency: "SAR" } },
      insurance_decision_summary: { decision: "APPROVED_PARTIAL", co_pay_amount: 12.5, insurer_share: 39 },
      delivery_address: { label: "Home", street: "12 King Fahd Rd", city: "Riyadh" },
    });
    expect(parsed).toMatchObject({ governedState: "FINAL_QUOTE_ACCEPTED", paymentStatus: "paid", coverageMode: "cash", totals: { subtotal: 46.5, deliveryFee: 5, total: 51.5, currency: "SAR" }, insurance: { decision: "APPROVED_PARTIAL", coPayAmount: 12.5, insurerShare: 39 }, address: { label: "Home", city: "Riyadh" } });
    expect(parseOrderPaymentView(null)).toBeNull();
  });
});

describe("the capabilities answer", () => {
  const body = { booking_id: ORDER, amount: 12.5, currency: "SAR", methods: [{ id: "card", kind: "online" }, { id: "wallet", kind: "online" }, { id: "card", kind: "online" }] };

  it("keeps the amount as sent and only the known methods, once each", () => {
    expect(capabilitiesFrom(200, body, ORDER)).toEqual({ status: "ok", amount: 12.5, currency: "SAR", methods: ["card"] });
  });

  it("refuses an answer for another order, a zero or missing amount, or no currency", () => {
    expect(capabilitiesFrom(200, body, TXN)).toEqual({ status: "error" });
    expect(capabilitiesFrom(200, { ...body, amount: 0 }, ORDER)).toEqual({ status: "error" });
    expect(capabilitiesFrom(200, { ...body, amount: undefined }, ORDER)).toEqual({ status: "error" });
    expect(capabilitiesFrom(200, { ...body, currency: undefined }, ORDER)).toEqual({ status: "error" });
  });

  it("a 4xx carries the backend's reason, a 5xx is an error", () => {
    expect(capabilitiesFrom(400, { statusCode: 400, message: "copay_acceptance_required" }, ORDER)).toEqual({ status: "refused", code: "copay_acceptance_required" });
    expect(capabilitiesFrom(400, { message: { code: "final_quote_acceptance_required" } }, ORDER)).toEqual({ status: "refused", code: "final_quote_acceptance_required" });
    expect(capabilitiesFrom(404, null, ORDER)).toEqual({ status: "refused", code: undefined });
    expect(capabilitiesFrom(503, null, ORDER)).toEqual({ status: "error" });
  });
});

describe("the payment result is whatever the backend says, never the address", () => {
  const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
  const route = (handlers: { order?: () => Response; verify?: () => Response }) =>
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/patient/patient/pharmacy/orders/")) {
        if (!handlers.order) throw new Error("offline");
        return handlers.order();
      }
      if (String(url).includes("/api/payments/verify/")) {
        if (!handlers.verify) throw new Error("offline");
        return handlers.verify();
      }
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;

  it("PAID only when the order says payment_status paid (no verification call is even needed)", async () => {
    const fetchImpl = route({ order: () => json(200, { governed_state: "CONFIRMED", payment_status: "paid" }) });
    expect((await checkPayment({ orderId: ORDER, transactionId: TXN }, fetchImpl)).phase).toEqual({ kind: "paid" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("PAID when the verified transaction is paid", async () => {
    const fetchImpl = route({ order: () => json(200, { governed_state: "FINAL_QUOTE_ACCEPTED" }), verify: () => json(200, { transactionId: TXN, status: "paid" }) });
    expect((await checkPayment({ orderId: ORDER, transactionId: TXN }, fetchImpl)).phase).toEqual({ kind: "paid" });
  });

  it("an open transaction is pending: it is never read as paid, whatever the address said", async () => {
    for (const status of ["pending", "initiating", "authorized", "something_new"]) {
      const fetchImpl = route({ order: () => json(200, { governed_state: "FINAL_QUOTE_ACCEPTED" }), verify: () => json(200, { transactionId: TXN, status }) });
      expect((await checkPayment({ orderId: ORDER, transactionId: TXN }, fetchImpl)).phase).toEqual({ kind: "pending" });
    }
  });

  it("failed, cancelled and refunded come from the transaction's status", async () => {
    const run = async (status: string) => (await checkPayment({ orderId: ORDER, transactionId: TXN }, route({ order: () => json(200, {}), verify: () => json(200, { status }) }))).phase.kind;
    expect(await run("failed")).toBe("failed");
    expect(await run("cancelled")).toBe("failed");
    expect(await run("refunded")).toBe("refunded");
    expect(await run("partially_refunded")).toBe("refunded");
  });

  it("a cancelled or expired order with nothing paid is 'closed', not a success and not a failure of the card", async () => {
    const fetchImpl = route({ order: () => json(200, { status: "expired" }) });
    expect((await checkPayment({ orderId: ORDER }, fetchImpl)).phase).toEqual({ kind: "expired" });
  });

  it("with an order but no transaction it stays pending until the order itself says paid", async () => {
    const fetchImpl = route({ order: () => json(200, { governed_state: "FINAL_QUOTE_ACCEPTED" }) });
    expect((await checkPayment({ orderId: ORDER }, fetchImpl)).phase).toEqual({ kind: "pending" });
  });

  it("learns the order from the verified transaction when the address did not name it", async () => {
    const fetchImpl = route({ verify: () => json(200, { transactionId: TXN, status: "paid", bookingKind: "pharmacy", bookingId: ORDER }) });
    const result = await checkPayment({ transactionId: TXN }, fetchImpl);
    expect(result.phase).toEqual({ kind: "paid" });
    expect(result.ids.orderId).toBe(ORDER);
  });

  it("nothing to ask about is 'unknown'; an unreachable backend is 'error', never a guess", async () => {
    expect((await checkPayment({})).phase).toEqual({ kind: "unknown" });
    expect((await checkPayment({ orderId: ORDER, transactionId: TXN }, route({}))).phase).toEqual({ kind: "error" });
    expect((await checkPayment({ orderId: ORDER, transactionId: TXN }, route({ order: () => json(503, null), verify: () => json(502, null) }))).phase).toEqual({ kind: "error" });
  });

  it("asks the bounded verification route (not the raw transaction), by POST, with the cookie", async () => {
    const fetchImpl = route({ order: () => json(200, {}), verify: () => json(200, { status: "pending" }) });
    await checkPayment({ orderId: ORDER, transactionId: TXN }, fetchImpl);
    const verify = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => String(url).includes("/verify/"));
    expect(verify?.[0]).toBe(`/api/payments/verify/${TXN}`);
    expect(verify?.[1]).toMatchObject({ method: "POST", credentials: "same-origin" });
  });

  it("the first thing drawn is 'checking', and a success word in the address changes nothing", () => {
    const html = render(<PaymentResult locale="en" reference="pay_123" />);
    expect(html).toContain("Checking your payment");
    expect(html).not.toContain("Payment successful");
    expect(html).toContain("pay_123");
    expect(html).not.toContain("style=");
    // the screen never reads a status from the address
    expect(read("components-next/pharmacy-checkout/payment-result.tsx")).not.toMatch(/searchParams|URLSearchParams|location\.search/);
    expect(read("app/[locale]/payments/result/page.tsx")).toContain("is never read");
  });

  it("status words map the way the backend names them", () => {
    expect(outcomeOfTransactionStatus("PAID")).toBe("paid");
    expect(outcomeOfTransactionStatus("authorized")).toBe("pending");
    expect(outcomeOfTransactionStatus(undefined)).toBe("pending");
    expect(parseVerification({ status: "failed" })).toEqual({ outcome: "failed" });
    expect(parseVerification({})).toBeNull();
  });
});

describe("the pointer to the payment the patient just handed to the provider", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
  };

  it("holds two ids and a time, nothing else, and gives them back", () => {
    const store = memory();
    rememberPayment({ orderId: ORDER, transactionId: TXN }, 1000, store);
    expect(JSON.parse([...store.data.values()][0])).toEqual({ orderId: ORDER, transactionId: TXN, at: 1000 });
    expect(recallPayment(2000, store)).toEqual({ orderId: ORDER, transactionId: TXN });
    forgetPayment(store);
    expect(recallPayment(2000, store)).toBeNull();
  });

  it("is dropped after two hours, when it is from the future, or when it is not what we wrote", () => {
    const store = memory();
    rememberPayment({ orderId: ORDER, transactionId: TXN }, 1000, store);
    expect(recallPayment(1000 + 2 * 60 * 60 * 1000 + 1, store)).toBeNull();
    expect(recallPayment(500, store)).toBeNull();
    store.setItem("nabd.payment.return", "{not json");
    expect(recallPayment(2000, store)).toBeNull();
    store.setItem("nabd.payment.return", JSON.stringify({ orderId: "x", transactionId: TXN, at: 1000 }));
    expect(recallPayment(2000, store)).toBeNull();
  });

  it("never stores something that is not an id, and works without storage", () => {
    const store = memory();
    rememberPayment({ orderId: "4111111111111111", transactionId: TXN }, 1, store);
    expect(store.data.size).toBe(0);
    expect(() => rememberPayment({ orderId: ORDER, transactionId: TXN }, 1, null)).not.toThrow();
    expect(recallPayment(1, null)).toBeNull();
  });
});

describe("where an order belongs, from the states the backend really produces", () => {
  const to = (view: OrderPaymentView) => routeForOrder(view, ORDER, "en");
  it("follows the governed state once an offer is selected", () => {
    expect(to({ governedState: "OFFER_SELECTED" })).toBe(`/en/pharmacy/final-quote?orderId=${ORDER}`);
    expect(to({ governedState: "FINAL_QUOTE_READY" })).toBe(`/en/pharmacy/final-quote?orderId=${ORDER}`);
    expect(to({ governedState: "FINAL_QUOTE_ACCEPTED" })).toBe(`/en/pharmacy/payment?orderId=${ORDER}`);
    expect(to({ governedState: "INSURANCE_PROCESSING" })).toBe(`/en/pharmacy/insurance-decision?orderId=${ORDER}`);
    expect(to({ governedState: "INSURANCE_DECISION_READY" })).toBe(`/en/pharmacy/insurance-decision?orderId=${ORDER}`);
    expect(to({ governedState: "COD_REGISTERED" })).toBe(`/en/orders/${ORDER}/tracking`);
    expect(to({ governedState: "IN_FULFILLMENT" })).toBe(`/en/orders/${ORDER}/tracking`);
  });

  it("before a selection the server sends no governed state: the order's status decides (OFFERS_READY never comes)", () => {
    expect(to({ status: "broadcasting" })).toBe(`/en/pharmacy/broadcast-status?orderId=${ORDER}`);
    expect(to({ status: "offer_selection_pending" })).toBe(`/en/pharmacy/broadcast-status?orderId=${ORDER}`);
    expect(to({ status: "negotiating_substitutes" })).toBe(`/en/pharmacy/broadcast-status?orderId=${ORDER}`);
    expect(to({ status: "draft" })).toBe(`/en/pharmacy/waiting-for-pharmacy?orderId=${ORDER}`);
    expect(to({ status: "delivered" })).toBe(`/en/orders/${ORDER}/tracking`);
    expect(to({})).toBe(`/en/orders/${ORDER}/tracking`);
  });

  it("a paid order goes to its tracking whatever its state", () => {
    expect(to({ governedState: "FINAL_QUOTE_ACCEPTED", paymentStatus: "paid" })).toBe(`/en/orders/${ORDER}/tracking`);
  });
});

describe("sending the cart as a request", () => {
  const lines = [{ name: "Paracetamol 500", qty: 2, sku: "m1" }, { name: "Vitamin C", qty: 500 }];

  it("carries names, quantities and the draft's own options: no price, no policy number, no identity number", () => {
    const body = buildBroadcastBody({ kind: "cart", lines, paymentMode: "insurance", fulfillment: "pickup" }, located);
    expect(body).toMatchObject({ fulfillment: "pickup", payment_mode: "insurance", items: [{ raw_name: "Paracetamol 500", qty: 2, sku: "m1", intake_source: "cart" }, { raw_name: "Vitamin C", qty: 99, intake_source: "cart" }] });
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/price|policy|national|nid|patient_notes|insurance:/i);
    expect(body).not.toHaveProperty("prescription_id");
    expect(buildBroadcastBody({ kind: "cart", lines, paymentMode: "cash", fulfillment: "delivery", prescriptionId: TXN }, located)).toMatchObject({ prescription_id: TXN, prescription_attachments: [TXN], payment_mode: "cash" });
  });

  const request: BroadcastRequest = { kind: "cart", lines, paymentMode: "cash", fulfillment: "delivery" };

  it("one send at a time: a second press while one is in flight sends nothing", async () => {
    let release: (r: BroadcastResult) => void = () => undefined;
    const send = vi.fn(() => new Promise<BroadcastResult>((resolveSend) => { release = resolveSend; }));
    const attempt = createBroadcastAttempt(send, () => "key-1");
    const first = attempt.run(request, located);
    expect(attempt.busy).toBe(true);
    expect(await attempt.run(request, located)).toBeNull();
    release({ ok: true, orderId: ORDER });
    expect(await first).toEqual({ ok: true, orderId: ORDER });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps the idempotency key after no answer (a dropped connection, a 5xx) and takes a new one after a server answer", async () => {
    const keys = ["k1", "k2", "k3", "k4"];
    const seen: string[] = [];
    const answers: BroadcastResult[] = [
      { ok: false, reason: "create_failed" }, // no answer
      { ok: false, reason: "submit_failed", status: 502 }, // a 5xx
      { ok: false, reason: "create_failed", status: 422 }, // refused for good
      { ok: true, orderId: ORDER },
      { ok: true, orderId: ORDER },
    ];
    const send = vi.fn(async (_request: BroadcastRequest, _address: unknown, key: string) => { seen.push(key); return answers.shift() as BroadcastResult; });
    const attempt = createBroadcastAttempt(send, () => keys.shift() as string);
    await attempt.run(request, located);
    await attempt.run(request, located);
    await attempt.run(request, located);
    await attempt.run(request, located);
    await attempt.run(request, located);
    expect(seen).toEqual(["k1", "k1", "k1", "k2", "k3"]);
  });

  it("a changed request is a different order: it gets its own key", async () => {
    const keys = ["k1", "k2", "k3"];
    const seen: string[] = [];
    const send = vi.fn(async (_r: BroadcastRequest, _a: unknown, key: string): Promise<BroadcastResult> => { seen.push(key); return { ok: false, reason: "create_failed" }; });
    const attempt = createBroadcastAttempt(send, () => keys.shift() as string);
    await attempt.run(request, located);
    await attempt.run({ ...request, paymentMode: "insurance" }, located);
    await attempt.run(request, { ...located, id: "a2" });
    expect(seen).toEqual(["k1", "k2", "k3"]);
  });
});

describe("the checkout screen", () => {
  beforeEach(() => {
    cart.value.items = [];
    cart.value.ready = true;
    cart.value.hasRxItems = false;
  });

  it("an empty cart is the board's empty state with a way out, not a form", () => {
    const html = render(<CheckoutScreen locale="en" />);
    expect(html).toContain("Your cart is empty");
    expect(html).toContain("Browse medicines");
    expect(html).not.toContain("Send request to pharmacies");
  });

  it("waits for the cart of this browser before it says anything", () => {
    cart.value.ready = false;
    const html = render(<CheckoutScreen locale="en" />);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Your cart is empty");
  });

  it("draws names and quantities, no price and no total of its own, and no card or identity field", () => {
    cart.value.items = [item(), item({ id: "m2", name: "Amoxicillin", qty: 1, rx: true })];
    cart.value.hasRxItems = true;
    const html = render(<CheckoutScreen locale="en" />);
    expect(html).toContain("Paracetamol 500");
    expect(html).toContain("Amoxicillin");
    expect(html).toContain("Needs a prescription");
    expect(html).toContain("Set by the pharmacy&#x27;s offer");
    expect(html).toContain("Shown with each offer");
    // the cart holds no price, so nothing here can be added up or drawn as money
    expect(html).not.toMatch(/55\.00|12\.50|30\.00|SAR/);
    expect(html).not.toMatch(/<input/);
    expect(html).not.toMatch(/national|iqama|policy number|card number|cvv/i);
    expect(html).not.toContain("style=");
    // nothing can be sent before the address and the prescription have been read
    expect(html).toMatch(/nabd-button[^"]*--disabled/);
  });
});

describe("the pay screen", () => {
  const props = { locale: "en" as const, orderId: ORDER, amount: 18.5, currency: "SAR", methods: ["card", "apple-pay"] as Array<"card" | "apple-pay">, coverage: "cash" as const, totals: { subtotal: 13.5, deliveryFee: 5, total: 18.5 } };

  it("shows the server's amount through the locale formatter, never a computed one", () => {
    const html = render(<PayScreen {...props} />);
    expect(html).toContain("Pay SAR 18.50");
    expect(html).toContain("SAR 13.50");
    expect(html).toContain("SAR 5.00");
    expect(html).not.toContain("style=");
  });

  it("asks for no card detail: the provider's own page takes it", () => {
    const html = render(<PayScreen {...props} />);
    expect(html).not.toMatch(/<input|cardnumber|cvv|cvc|expiry/i);
    expect(html).toContain("never sees or stores them");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("Bank card");
    expect(html).toContain("Apple Pay");
  });

  it("through insurance it shows the share the server states, and what insurance covers", () => {
    const html = render(<PayScreen {...props} amount={12.5} coverage="insurance" insurerShare={6} />);
    expect(html).toContain("Pay SAR 12.50");
    expect(html).toContain("Covered by insurance");
    expect(html).toContain("SAR 6.00");
    expect(html).toContain("Your share, to pay now");
    expect(html).toContain("Your insurer covers its part");
  });

  it("keeps a card number, and anything else the patient could type, out of the module (no storage, no logging, no URL)", () => {
    for (const file of ["components-next/pharmacy-checkout/pay-screen.tsx", "lib/pharmacy/payment-return.ts"]) {
      const text = read(file);
      expect(text).not.toMatch(/console\.(log|info|warn|error)/);
      expect(text).not.toMatch(/localStorage|document\.cookie/);
    }
    // the pointer holds ids only
    expect(read("lib/pharmacy/payment-return.ts").replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/(card number|cvv|access_token)/i);
  });

  it("goes to the provider only at an https address the server named with its transaction, and remembers the transaction", () => {
    const answer = { transactionId: TXN, status: "pending", checkoutUrl: "https://pay.example.test/s/1" };
    expect(transactionIdOf(answer)).toBe(TXN);
    expect(checkoutUrlOf(answer)).toBe("https://pay.example.test/s/1");
    expect(checkoutUrlOf({ transactionId: "not-a-uuid", checkoutUrl: "https://x.test" })).toBeUndefined();
    expect(transactionIdOf({ id: TXN })).toBe(TXN);
    expect(transactionIdOf({ id: "tx_1" })).toBeUndefined();
    const source = read("components-next/pharmacy-checkout/pay-screen.tsx");
    expect(source).toContain("isTrustedCheckoutUrl(url)");
    expect(source).toContain("rememberPayment({ orderId, transactionId })");
  });
});

describe("the payment page (server screen)", () => {
  const draw = async (view: OrderPaymentView, caps?: unknown) => {
    server.order.mockResolvedValue({ ok: true, view });
    server.caps.mockResolvedValue(caps ?? { status: "ok", amount: 40, currency: "SAR", methods: ["card"] });
    return render(await PaymentScreen({ locale: "en", orderId: ORDER }));
  };

  it("an order the server says is paid shows 'confirmed' and a way to track it, without asking for capabilities", async () => {
    server.caps.mockClear();
    const html = await draw({ governedState: "CONFIRMED", paymentStatus: "paid" });
    expect(html).toContain("Payment confirmed");
    expect(html).toContain("Track the order");
    expect(server.caps).not.toHaveBeenCalled();
  });

  it("an accepted price with capabilities draws the pay screen with the server's amount", async () => {
    const html = await draw({ governedState: "FINAL_QUOTE_ACCEPTED", coverageMode: "cash", totals: { total: 40 } });
    expect(html).toContain("Pay SAR 40.00");
  });

  it("an order whose price was not accepted yet shows the step to take, never a pay button", async () => {
    const html = await draw({ governedState: "OFFER_SELECTED" });
    expect(html).toContain("Accept the final price first");
    expect(html).not.toContain("Pay SAR");
  });

  it("a gateway with no methods says online payment is not open, with a retry and a way out", async () => {
    const html = await draw({ governedState: "FINAL_QUOTE_ACCEPTED" }, { status: "ok", amount: 40, currency: "SAR", methods: [] });
    expect(html).toContain("Online payment is not open right now");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Pay SAR");
  });

  it("an order that cannot be read is an error state with a retry, not a pay screen", async () => {
    server.order.mockResolvedValue({ ok: false });
    const html = render(await PaymentScreen({ locale: "en", orderId: ORDER }));
    expect(html).toContain("The offers could not be loaded");
    expect(html).toContain("Try again");
  });
});

describe("the insurance decision", () => {
  const progress = (summary: Record<string, unknown>) => extractPatientPharmacyOrderProgress({
    governed_state: "INSURANCE_DECISION_READY",
    insurance_decision_summary: summary,
    insurance_item_decisions: [{ order_item_id: "i1", decision: "APPROVED_PARTIAL", line_amount: 40, covered_amount: 30, co_pay_amount: 10 }],
    items: [{ id: "i1", name_en: "Paracetamol" }],
  }) ?? {};
  const draw = async (summary: Record<string, unknown>) => render(await InsuranceDecision({ locale: "en", orderId: ORDER, progress: progress(summary) }));

  it("a partial approval offers the share or the full price, and needs no payment method to accept", async () => {
    const html = await draw({ decision: "APPROVED_PARTIAL", co_pay_amount: 10, insurer_share: 30 });
    expect(html).toContain("Accept and pay my share");
    expect(html).toContain("Pay the full price myself");
    expect(html).not.toContain("Choose a payment method");
    expect(html).not.toContain("Cancel the order");
    expect(html).toContain("SAR 10.00");
    expect(html).toContain("SAR 30.00");
  });

  it("a rejection offers the full price or cancelling, and no share to accept", async () => {
    const html = await draw({ decision: "REJECTED", co_pay_amount: 40, insurer_share: 0 });
    expect(html).not.toContain("Accept and pay my share");
    expect(html).toContain("Pay the full price myself");
    expect(html).toContain("Cancel the order");
  });

  it("accepting asks for no payment method and no capabilities, and goes on to the payment step", () => {
    const source = read("components-next/pharmacy-offers/payment-actions.tsx");
    const accept = source.slice(source.indexOf("export function InsuranceDecisionActions"), source.indexOf("export function RejectedInsuranceCancel"));
    expect(accept).not.toContain("useCapabilities");
    expect(accept).not.toContain("payment_method");
    expect(accept).toContain("/pharmacy/payment?orderId=");
  });
});

describe("what the browser may call", () => {
  it("allows the rejected-insurance cancel on an order id, and only that", () => {
    expect(isAllowedPatientApiRequest(`/patient/pharmacy/orders/${ORDER}/insurance-rejection/cancel`, "POST")).toBe(true);
    expect(isAllowedPatientApiRequest(`/patient/pharmacy/orders/${ORDER}/insurance-rejection/cancel`, "GET")).toBe(false);
    expect(isAllowedPatientApiRequest("/patient/pharmacy/orders/x/insurance-rejection/cancel", "POST")).toBe(false);
  });

  it("the broadcast no longer goes through the any-cookie route", () => {
    expect(() => read("app/api/patient/pharmacy/orders/route.ts")).toThrow();
    expect(read("components-next/pharmacy-checkout/checkout-screen.tsx")).not.toContain("/api/patient/pharmacy/orders");
  });
});

describe("small readers", () => {
  it("the saved prescription is the first active one with a real id", () => {
    expect(activePrescriptionId([{ id: "nope" }, { id: TXN }])).toBe(TXN);
    expect(activePrescriptionId({ data: [{ id: TXN }] })).toBe(TXN);
    expect(activePrescriptionId([])).toBeNull();
    expect(activePrescriptionId(null)).toBeNull();
  });

  it("the insurance row shows who insures the patient and the class, never a number", () => {
    expect(parseInsurancePolicy({ has_policy: true, policy: { company_name: "Bupa", plan_class: "A", policy_number: "9023", national_id: "1000000000" } })).toEqual({ company: "Bupa", planClass: "A" });
    expect(parseInsurancePolicy({ has_policy: false, policy: {} })).toBeNull();
    expect(parseInsurancePolicy(null)).toBeNull();
  });

  it("already-paid and the payment refusals are told apart from a generic failure", () => {
    expect(classifyError(400, "booking_already_paid")).toBe("alreadyPaid");
    expect(classifyError(400, "payment_order_not_collectable")).toBe("notActionable");
    expect(classifyError(400, "copay_acceptance_required")).toBe("notActionable");
    expect(classifyError(503, "payment_gateway_not_configured")).toBe("network");
  });
});

describe("the screens of this slice are tokens-only and carry no text of their own", () => {
  const files = [
    "components-next/pharmacy-checkout/checkout-screen.tsx", "components-next/pharmacy-checkout/pay-screen.tsx", "components-next/pharmacy-checkout/payment-result.tsx",
    "components-next/pharmacy-checkout/payment-screen.tsx", "components-next/pharmacy-checkout/insurance-screen.tsx", "components-next/pharmacy-checkout/status-refresh.tsx",
    "components-next/pharmacy-checkout/checkout.module.css", "app/[locale]/pharmacy/order-confirm/page.tsx", "app/[locale]/payments/result/page.tsx",
  ];
  it("no raw colour, no inline style, no zod, no left/right, no fixed button width", () => {
    for (const file of files) {
      const text = read(file);
      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
      expect(text, file).not.toMatch(/style=\{\{|\bstyle=["']/);
      expect(text, file).not.toMatch(/from "zod"/);
      expect(text, file).not.toMatch(/\b(margin|padding)-(left|right)\b|\b(left|right):/);
    }
  });

  it("no zod in anything these client screens import from lib", () => {
    for (const file of ["lib/pharmacy/payment-state.ts", "lib/pharmacy/payment-return.ts", "lib/pharmacy/checkout-support.ts", "lib/pharmacy/order-route.ts", "lib/pharmacy/broadcast.ts", "lib/api/pharmacy-payment.ts"]) {
      expect(read(file), file).not.toMatch(/from "zod"/);
    }
  });
});

describe("the strings exist in all six languages with the same slots", () => {
  const used = (file: string, ns: string) => [...read(file).matchAll(new RegExp(`\\bt\\("([A-Za-z.]+)"`, "g"))].map((m) => `${ns}.${m[1]}`);
  it("every PharmacyCheckout and Payments key the screens read is non-empty in ar, en, ur, hi, bn and fil", () => {
    const keys = [
      ...used("components-next/pharmacy-checkout/checkout-screen.tsx", "PharmacyCheckout"),
      ...used("components-next/pharmacy-checkout/pay-screen.tsx", "PharmacyCheckout").filter((key) => !/methodCard|methodApplePay|methodGooglePay|paymentError|redirecting|noRedirect/.test(key)),
      ...used("components-next/pharmacy-checkout/insurance-screen.tsx", "PharmacyCheckout"),
      ...used("components-next/pharmacy-checkout/status-refresh.tsx", "PharmacyCheckout"),
    ].filter((key) => key.startsWith("PharmacyCheckout.") && !/^PharmacyCheckout\.(state|errors)$/.test(key));
    expect(keys.length).toBeGreaterThan(40);
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const messages = JSON.parse(read(`messages/${locale}.json`)) as Record<string, Record<string, unknown>>;
      for (const key of keys) {
        const [ns, ...rest] = key.split(".");
        let node: unknown = messages[ns];
        for (const part of rest) node = (node as Record<string, unknown> | undefined)?.[part];
        expect(typeof node === "string" && node.trim().length > 0, `${locale}:${key}`).toBe(true);
      }
      const payments = messages.Payments as Record<string, string>;
      for (const key of ["pageTitle", "checkingTitle", "checkingBody", "checkAgain", "trackOrder", "stalledTitle", "stalledBody", "refundedTitle", "refundedBody", "expiredTitle", "expiredBody", "unknownTitle", "unknownBody", "errorTitle", "errorBody", "successTitle", "failedTitle", "processingTitle", "reference", "retry", "myOrders"]) {
        expect(payments[key]?.trim(), `${locale}:Payments.${key}`).toBeTruthy();
      }
      const offers = messages.PharmacyOffers as { errors: Record<string, string> };
      expect(offers.errors.alreadyPaid.trim(), `${locale}:alreadyPaid`).toBeTruthy();
      const checkout = messages.PharmacyCheckout as { state: Record<string, string> };
      for (const key of ["paid", "covered", "cod", "closed", "fulfilment", "noQuote", "acceptFirst", "insuranceFirst"]) {
        expect(checkout.state[`${key}Title`]?.trim(), `${locale}:state.${key}Title`).toBeTruthy();
        expect(checkout.state[`${key}Body`]?.trim(), `${locale}:state.${key}Body`).toBeTruthy();
      }
    }
  });
});
