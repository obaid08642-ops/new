import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
// the real en messages through the real ICU translator (plurals and numbers included), so a missing key or a bad message fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return {
    getTranslations: async (arg: string | { locale?: string; namespace?: string }) =>
      actual.createTranslator({ locale: "en", messages: messages as never, namespace: (typeof arg === "string" ? arg : arg.namespace) as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => <div data-shell data-title={title} data-back={backHref}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-order-token" }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: server.api }));

import { actionHref, OrderList } from "@/components-next/orders/order-list";
import { OrderDetailScreen } from "@/components-next/orders/order-detail-screen";
import { OrdersScreen } from "@/components-next/orders/orders-screen";
import { ReorderPicker } from "@/components-next/orders/reorder-picker";
import { ReorderScreen } from "@/components-next/orders/reorder-screen";
import { TrackingScreen } from "@/components-next/orders/tracking-screen";
import {
  cartItemsFor, dialable, isMoving, isPrevious, orderAction, orderNumber, parseOrderDetail, parseOrderRows, reorderLines, trackingSteps,
} from "@/lib/pharmacy/order-view";

const ORDER = "91047ef2-ad36-422a-a184-629693e7c729";
const TOKEN = "server-only-order-token";
const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/ /g, " ");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ts = (hour: number) => `2026-10-05T${String(hour).padStart(2, "0")}:00:00.000Z`;

/** A pharmacy order as GET /patient/pharmacy/orders/:id sends it (the fields the screens read, plus ones they must not draw). */
const order = (over: Record<string, unknown> = {}) => ({
  id: ORDER, status: "out_for_delivery", effective_status: "out_for_delivery", governed_state: "OUT_FOR_DELIVERY", payment_status: "paid", coverage_mode: "cash",
  createdAt: ts(8), fulfillment: "delivery", prescription_id: null,
  items: [
    { id: "i1", raw_name: "Paracetamol 500", name_en: "Paracetamol 500 mg", name_ar: "باراسيتامول", qty: 2, matched_sku: "sku-1" },
    { id: "i2", raw_name: "A typed request", qty: 1 },
  ],
  totals: { subtotal: 46.5, delivery_fee: 5, total: 51.5, currency: "SAR" },
  pricing_snapshot: { totals: { subtotal: 46.5, delivery_fee: 5, total: 51.5, currency: "SAR" } },
  delivery_address: { label: "Home", street: "12 King Fahd Rd", district: "Olaya", city: "Riyadh", geo: { lat: 24.7, lng: 46.7 } },
  delivery: { method: "pharmacy_delivery", courier_name: "Test Courier", courier_phone: "+966 50 123 4567", courier_eta: ts(14), dispatched_at: ts(12) },
  timeline: [{ ts: ts(9), event: "all_allocations_confirmed" }, { ts: ts(10), event: "fulfillment_started" }, { ts: ts(12), event: "first_out_for_delivery" }],
  patient_account_id: "private-patient-account", patient_notes: "private-notes",
  ...over,
});

beforeEach(() => { server.api.mockReset(); });

describe("reading what the API sends", () => {
  it("a list row carries the server's status and the price of the selected offer only; a zero total is no price", () => {
    const rows = parseOrderRows([
      { id: "a", status: "draft", createdAt: ts(1), items: [{}, {}], totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: "SAR" } },
      { id: "b", status: "cash_card_payment_pending", effective_status: "in_fulfillment", totals: { total: 40, currency: "SAR" }, pricing_snapshot: { totals: { total: 51.5, currency: "SAR" } } },
      { status: "no id" },
    ]);
    expect(rows).toEqual([
      { id: "a", status: "draft", createdAt: ts(1), itemCount: 2 },
      { id: "b", status: "in_fulfillment", total: 51.5, currency: "SAR" },
    ]);
    expect(parseOrderRows({ data: [{ id: "c" }] })).toEqual([{ id: "c" }]);
    expect(parseOrderRows(null)).toEqual([]);
  });

  it("an order is known by the end of its id, and only delivered, completed and cancelled orders are previous", () => {
    expect(orderNumber(ORDER)).toBe("E7C729");
    for (const status of ["delivered", "completed", "cancelled", "DELIVERED"]) expect(isPrevious(status)).toBe(true);
    for (const status of ["draft", "broadcasting", "out_for_delivery", undefined]) expect(isPrevious(status)).toBe(false);
  });

  it("the action follows the status: reorder a finished order, track one being fulfilled, details for a cancelled one, continue the rest", () => {
    expect(orderAction("delivered")).toBe("reorder");
    expect(orderAction("completed")).toBe("reorder");
    expect(orderAction("out_for_delivery")).toBe("track");
    expect(orderAction("in_fulfillment")).toBe("track");
    expect(orderAction("confirmed")).toBe("track");
    expect(orderAction("cancelled")).toBe("details");
    for (const status of ["draft", "broadcasting", "offer_selection_pending", "cash_card_payment_pending", "cod_due_on_delivery", undefined]) expect(orderAction(status)).toBe("continue");
    expect(actionHref("en", ORDER, "continue")).toBe(`/en/pharmacy/order-confirm?orderId=${ORDER}`);
    expect(actionHref("en", ORDER, "reorder")).toBe(`/en/pharmacy/reorder?orderId=${ORDER}`);
    expect(actionHref("en", ORDER, "track")).toBe(`/en/orders/${ORDER}/tracking`);
  });

  it("the detail names lines in the reader's language and keeps what the server stored: lines, price, courier, events", () => {
    const en = parseOrderDetail(order(), "en");
    const ar = parseOrderDetail(order(), "ar");
    expect(en?.lines).toEqual([{ id: "i1", name: "Paracetamol 500 mg", qty: 2, sku: "sku-1" }, { id: "i2", name: "A typed request", qty: 1, sku: undefined }]);
    expect(ar?.lines[0].name).toBe("باراسيتامول");
    expect(en?.totals).toEqual({ subtotal: 46.5, deliveryFee: 5, total: 51.5, currency: "SAR" });
    expect(en?.courier).toEqual({ name: "Test Courier", phone: "+966 50 123 4567", eta: ts(14) });
    expect(en?.events.map((entry) => entry.event)).toEqual(["all_allocations_confirmed", "fulfillment_started", "first_out_for_delivery"]);
    expect(en?.prescriptionId).toBeUndefined();
    expect(parseOrderDetail({ data: order({ prescription_id: "rx-1" }) }, "en")?.prescriptionId).toBe("rx-1");
    expect(parseOrderDetail({}, "en")).toBeNull();
    // a draft has no price: its zero totals are not drawn as a price
    expect(parseOrderDetail(order({ status: "draft", effective_status: "draft", totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: "SAR" }, pricing_snapshot: undefined }), "en")?.totals).toBeUndefined();
  });
});

describe("the steps of the tracking page come from the order's status and logged events", () => {
  const events = parseOrderDetail(order(), "en")?.events ?? [];
  const steps = (status: string, fulfillment: "delivery" | "pickup" = "delivery") => trackingSteps({ status, fulfillment, events });

  it("walks accepted, preparing, on the way, delivered: done behind the order's status, current at it, upcoming after", () => {
    expect(steps("out_for_delivery").map((step) => [step.id, step.state])).toEqual([["accepted", "done"], ["preparing", "done"], ["onTheWay", "current"], ["delivered", "upcoming"]]);
    expect(steps("in_fulfillment").map((step) => step.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(steps("confirmed").map((step) => step.state)).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(steps("delivered").map((step) => step.state)).toEqual(["done", "done", "done", "done"]);
    expect(steps("completed").map((step) => step.state)).toEqual(["done", "done", "done", "done"]);
  });

  it("a step has a time only when the server logged its event, and an upcoming step never has one", () => {
    const out = steps("out_for_delivery");
    expect(out.map((step) => step.at)).toEqual([ts(9), ts(10), ts(12), undefined]);
    expect(trackingSteps({ status: "in_fulfillment", fulfillment: "delivery", events: [] }).map((step) => step.at)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("an order the pharmacy has not confirmed has no step reached, a cancelled one has no steps, a pickup has no 'on the way'", () => {
    expect(steps("cash_card_payment_pending").every((step) => step.state === "upcoming")).toBe(true);
    expect(steps("cod_due_on_delivery").every((step) => step.state === "upcoming")).toBe(true);
    expect(steps("cancelled")).toEqual([]);
    expect(steps("in_fulfillment", "pickup").map((step) => [step.id, step.state])).toEqual([["accepted", "done"], ["preparing", "current"], ["pickedUp", "upcoming"]]);
    expect(steps("delivered", "pickup").map((step) => step.state)).toEqual(["done", "done", "done"]);
  });

  it("keeps asking the server until the order is finished, and only dials a real number", () => {
    expect(isMoving("out_for_delivery")).toBe(true);
    expect(isMoving("draft")).toBe(true);
    for (const status of ["delivered", "completed", "cancelled", undefined]) expect(isMoving(status)).toBe(false);
    expect(dialable("+966 50 123 4567")).toBe("+966501234567");
    expect(dialable("0501234567")).toBe("0501234567");
    expect(dialable("javascript:alert(1)")).toBeUndefined();
    expect(dialable("12")).toBeUndefined();
    expect(dialable(undefined)).toBeUndefined();
  });
});

describe("/orders", () => {
  it("draws the orders the backend sent through the server read, never the session token, and no style attribute", async () => {
    server.api.mockResolvedValue(json([{ id: ORDER, status: "out_for_delivery", createdAt: ts(8), items: [{}], pricing_snapshot: { totals: { total: 51.5, currency: "SAR" } } }]));
    const html = render(await OrdersScreen({ locale: "en" }));
    expect(server.api).toHaveBeenCalledWith("/patient/pharmacy/orders", {}, TOKEN);
    expect(html).toContain(`href="/en/orders/${ORDER}"`);
    expect(html).toContain(`href="/en/orders/${ORDER}/tracking"`); // out for delivery: the action is "track"
    expect(html).toContain("SAR 51.50"); // the server's price, as sent
    expect(html).toContain("On the way");
    expect(html).not.toContain(TOKEN);
    expect(html).not.toContain("style=");
  });

  it("an order that is still being arranged continues through the order router; a delivered one can be ordered again; nothing is priced before an offer is selected", async () => {
    server.api.mockResolvedValue(json([
      { id: ORDER, status: "broadcasting", items: [{}, {}], totals: { total: 0, currency: "SAR" } },
      { id: "11111111-2222-4333-8444-555555555555", status: "delivered", items: [{}], pricing_snapshot: { totals: { total: 20, currency: "SAR" } } },
    ]));
    const html = render(await OrdersScreen({ locale: "en" }));
    expect(html).toContain(`href="/en/pharmacy/order-confirm?orderId=${ORDER}"`);
    expect(html).not.toContain("SAR 0.00");
    expect(html).not.toContain("0.00");
    // the default tab is the current one; the delivered order is under "previous" (it is rendered only after the tab is picked)
    expect(html).not.toContain("reorder?orderId");
  });

  it("with only finished orders it opens on the previous tab, where an order can be ordered again", () => {
    const html = render(<OrderList locale="en" rows={[{ id: ORDER, status: "delivered", total: 20, currency: "SAR" }]} />);
    expect(html).toContain(`href="/en/pharmacy/reorder?orderId=${ORDER}"`);
    expect(html).toContain("SAR 20.00");
  });

  it("says so when there is no order, and shows the error state with a retry when the backend fails", async () => {
    server.api.mockResolvedValue(json([]));
    expect(render(await OrdersScreen({ locale: "en" }))).toContain("No orders yet");
    server.api.mockResolvedValue(new Response("{}", { status: 500 }));
    const failed = render(await OrdersScreen({ locale: "en" }));
    expect(failed).toContain("Your orders could not be loaded");
    expect(failed).toContain("Try again");
    expect(failed).not.toContain("No orders yet");
  });

  it("sends a signed-out visitor to sign-in", async () => {
    server.api.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(OrdersScreen({ locale: "en" })).rejects.toThrow("redirect:/en/login");
  });
});

describe("/orders/:id", () => {
  it("draws the order's own lines, price and address, and nothing private the API also sent", async () => {
    server.api.mockResolvedValue(json(order()));
    const html = render(await OrderDetailScreen({ locale: "en", orderId: ORDER }));
    expect(server.api).toHaveBeenCalledWith(`/patient/pharmacy/orders/${ORDER}`, {}, TOKEN);
    expect(html).toContain("Paracetamol 500 mg");
    expect(html).toContain("× 2");
    expect(html).toContain("SAR 51.50");
    expect(html).toContain("SAR 46.50");
    expect(html).toContain("SAR 5.00");
    expect(html).toContain("Home");
    expect(html).toContain("Paid");
    for (const secret of [TOKEN, "private-patient-account", "private-notes", "geo"]) expect(html).not.toContain(secret);
    expect(html).not.toContain("style=");
  });

  it("the one action follows the order: an order out for delivery is tracked, one waiting for payment goes to payment, a delivered one is ordered again", async () => {
    server.api.mockResolvedValue(json(order()));
    expect(render(await OrderDetailScreen({ locale: "en", orderId: ORDER }))).toContain(`href="/en/orders/${ORDER}/tracking"`);
    server.api.mockResolvedValue(json(order({ status: "cash_card_payment_pending", effective_status: "cash_card_payment_pending", governed_state: "FINAL_QUOTE_ACCEPTED", payment_status: undefined })));
    expect(render(await OrderDetailScreen({ locale: "en", orderId: ORDER }))).toContain(`href="/en/pharmacy/payment?orderId=${ORDER}"`);
    server.api.mockResolvedValue(json(order({ status: "broadcasting", effective_status: "broadcasting", governed_state: null, payment_status: undefined, totals: { total: 0 }, pricing_snapshot: undefined })));
    const waiting = render(await OrderDetailScreen({ locale: "en", orderId: ORDER }));
    expect(waiting).toContain(`href="/en/pharmacy/broadcast-status?orderId=${ORDER}"`);
    expect(waiting).not.toContain("Price"); // no price section before an offer is selected
    server.api.mockResolvedValue(json(order({ status: "delivered", effective_status: "delivered", governed_state: "DELIVERED" })));
    const done = render(await OrderDetailScreen({ locale: "en", orderId: ORDER }));
    expect(done).toContain(`href="/en/pharmacy/reorder?orderId=${ORDER}"`);
    expect(done).toContain(`href="/en/orders/${ORDER}/tracking"`);
  });

  it("a failed read is an error with a retry, a missing or foreign order is the 404 page", async () => {
    server.api.mockResolvedValue(new Response("{}", { status: 503 }));
    expect(render(await OrderDetailScreen({ locale: "en", orderId: ORDER }))).toContain("The order could not be loaded");
    server.api.mockResolvedValue(new Response("{}", { status: 404 }));
    await expect(OrderDetailScreen({ locale: "en", orderId: ORDER })).rejects.toThrow("not-found");
    server.api.mockResolvedValue(new Response("{}", { status: 403 }));
    await expect(OrderDetailScreen({ locale: "en", orderId: ORDER })).rejects.toThrow("not-found");
    await expect(OrderDetailScreen({ locale: "en", orderId: "not-an-id" })).rejects.toThrow("not-found");
  });
});

describe("/orders/:id/tracking", () => {
  it("reads the pharmacy order (the legacy tracking endpoint does not know pharmacy orders) and draws the steps, the arrival, the courier", async () => {
    server.api.mockResolvedValue(json(order()));
    const html = render(await TrackingScreen({ locale: "en", orderId: ORDER }));
    expect(server.api).toHaveBeenCalledTimes(1);
    expect(server.api).toHaveBeenCalledWith(`/patient/pharmacy/orders/${ORDER}`, {}, TOKEN);
    for (const text of ["Order accepted", "Preparing your order", "On the way to you", "Delivered", "Expected arrival", "Test Courier", "Call the courier"]) expect(html).toContain(text);
    expect(html).toContain('href="tel:+966501234567"');
    expect(html).toMatch(/aria-current="step"[^>]*>(?:(?!<\/li>)[\s\S])*On the way to you/);
    expect(html).toContain("Checking for updates"); // still moving: it keeps asking the server
    expect(html).toContain("2 items");
    expect(html).toContain("SAR 51.50");
    for (const secret of [TOKEN, "private-patient-account", "private-notes"]) expect(html).not.toContain(secret);
  });

  it("draws nothing the API did not send: no arrival or courier without them, and no map", async () => {
    server.api.mockResolvedValue(json(order({ delivery: undefined, timeline: [], status: "in_fulfillment", effective_status: "in_fulfillment" })));
    const html = render(await TrackingScreen({ locale: "en", orderId: ORDER }));
    expect(html).not.toContain("Expected arrival");
    expect(html).not.toContain("Courier");
    expect(html).not.toContain("tel:");
    expect(html).not.toMatch(/<(iframe|canvas|svg[^>]*map)/i);
    expect(html).toContain("Being prepared"); // the server's status stands in for the arrival time
  });

  it("an order before confirmation says tracking has not started; a cancelled one says so and has no steps; a delivered one stops asking", async () => {
    server.api.mockResolvedValue(json(order({ status: "cash_card_payment_pending", effective_status: "cash_card_payment_pending", delivery: undefined, timeline: [] })));
    expect(render(await TrackingScreen({ locale: "en", orderId: ORDER }))).toContain("Tracking starts when the pharmacy confirms your order.");
    server.api.mockResolvedValue(json(order({ status: "cancelled", effective_status: "cancelled" })));
    const cancelled = render(await TrackingScreen({ locale: "en", orderId: ORDER }));
    expect(cancelled).toContain("This order was cancelled.");
    expect(cancelled).not.toContain("Order accepted");
    server.api.mockResolvedValue(json(order({ status: "delivered", effective_status: "delivered" })));
    const delivered = render(await TrackingScreen({ locale: "en", orderId: ORDER }));
    expect(delivered).not.toContain("Checking for updates");
    expect(delivered).not.toContain("Expected arrival");
  });

  it("a failed read is an error with a retry and a way back", async () => {
    server.api.mockResolvedValue(new Response("{}", { status: 500 }));
    const html = render(await TrackingScreen({ locale: "en", orderId: ORDER }));
    expect(html).toContain("The order could not be loaded");
    expect(html).toContain("Try again");
  });
});

describe("/pharmacy/reorder", () => {
  const detail = parseOrderDetail(order(), "en")!;

  it("only a line the catalogue knows can go to the cart; a typed request is counted and sent on as a request", () => {
    const { addable, skipped } = reorderLines(detail);
    expect(addable.map((line) => line.sku)).toEqual(["sku-1"]);
    expect(skipped).toBe(1);
  });

  it("puts what was ticked in the cart with the catalogue id, the patient's quantity and no price, marked for a prescription when the order used one", () => {
    const { addable } = reorderLines(detail);
    expect(cartItemsFor(addable, { i1: { on: true, qty: 3 } }, false)).toEqual([{ id: "sku-1", name: "Paracetamol 500 mg", rx: false, qty: 3 }]);
    expect(cartItemsFor(addable, { i1: { on: true, qty: 500 } }, true)).toEqual([{ id: "sku-1", name: "Paracetamol 500 mg", rx: true, qty: 99 }]);
    expect(cartItemsFor(addable, { i1: { on: true, qty: 0 } }, false)[0].qty).toBe(1);
    expect(cartItemsFor(addable, { i1: { on: false, qty: 2 } }, false)).toEqual([]);
    expect(cartItemsFor(addable, {}, false)).toEqual([]);
  });

  it("draws the lines with their quantities, says how many were not added, and has a prescription note only when the order used one", () => {
    const { addable, skipped } = reorderLines(detail);
    const html = render(<ReorderPicker locale="en" orderId={ORDER} lines={addable} skipped={skipped} needsPrescription={false} />);
    expect(html).toContain("Paracetamol 500 mg");
    expect(html).toContain("Add to cart");
    expect(html).toContain('href="/en/pharmacy/request"');
    expect(html).not.toContain("prescription: it is needed again");
    expect(render(<ReorderPicker locale="en" orderId={ORDER} lines={addable} skipped={0} needsPrescription />)).toContain("prescription");
    expect(html).not.toContain("style=");
  });

  it("an order with nothing in the catalogue says so instead of showing an empty list", () => {
    const html = render(<ReorderPicker locale="en" orderId={ORDER} lines={[]} skipped={2} needsPrescription={false} />);
    expect(html).toContain("Nothing to add");
    expect(html).not.toContain("Add to cart");
  });

  it("reads the order through the server and lists its lines", async () => {
    server.api.mockResolvedValue(json(order({ prescription_id: "rx-1" })));
    const html = render(await ReorderScreen({ locale: "en", orderId: ORDER }));
    expect(server.api).toHaveBeenCalledWith(`/patient/pharmacy/orders/${ORDER}`, {}, TOKEN);
    expect(html).toContain("Paracetamol 500 mg");
    expect(html).not.toContain("A typed request");
  });
});
