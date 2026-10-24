import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";
import { parseLegacyOrderRows, parseLegacyTracking } from "@/lib/pharmacy/order-view";
import { parseOrderPaymentView } from "@/lib/pharmacy/payment-state";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const ORDER = "91047ef2-ad36-422a-a184-629693e7c729";

// Parity audit (pharmacy): the web screens match the app's.
describe("final quote lines (the chosen pharmacy's allocation)", () => {
  it("reads the lines of the selected allocation, with the unavailable and substitute marks", () => {
    const progress = extractPatientPharmacyOrderProgress({
      id: ORDER,
      selected_allocation_id: "al1",
      allocations_detail: [
        { id: "al0", items: [{ order_item_id: "x", name: "Other", qty_offered: 1, unit_price: 1 }] },
        { id: "al1", items: [
          { order_item_id: "i1", name: "Panadol", qty_offered: 2, unit_price: 12.5, action: "accept" },
          { order_item_id: "i2", name: "Brufen", action: "unavailable" },
          { order_item_id: "i3", name: "Augmentin", qty_offered: 1, unit_price: 40, action: "substitute" },
        ] },
      ],
    });
    expect(progress?.quoteLines).toEqual([
      { id: "i1", name: "Panadol", quantity: 2, unitPrice: 12.5, action: "available" },
      { id: "i2", name: "Brufen", quantity: undefined, unitPrice: undefined, action: "unavailable" },
      { id: "i3", name: "Augmentin", quantity: 1, unitPrice: 40, action: "substitute" },
    ]);
  });

  it("has no lines when the order names no allocation", () => {
    expect(extractPatientPharmacyOrderProgress({ id: ORDER, allocations_detail: [{ id: "al1", items: [{ name: "A" }] }] })?.quoteLines).toBeUndefined();
  });
});

describe("the payment page header", () => {
  it("reads pickup and the pharmacy name from the order", () => {
    const view = parseOrderPaymentView({ fulfillment: "pickup", pharmacy_name_ar: "صيدلية", pharmacy_name_en: "Pharmacy" });
    expect(view).toMatchObject({ fulfillment: "pickup", pharmacyNames: { ar: "صيدلية", en: "Pharmacy" } });
    expect(parseOrderPaymentView({ delivery: { method: "pharmacy_delivery" } })?.fulfillment).toBe("delivery");
    expect(parseOrderPaymentView({})?.fulfillment).toBeUndefined();
  });

  it("keeps the started transaction so the patient can check the payment", () => {
    const screen = read("components-next/pharmacy-checkout/pay-screen.tsx");
    expect(screen).toContain("setStartedTransaction(started)");
    expect(screen).toContain("/payments/result?orderId=");
  });
});

describe("orders of the old flow", () => {
  it("lists them from GET /orders/mine rows, lower-cased state, no id no row", () => {
    const rows = parseLegacyOrderRows([{ id: "o1", state: "OUT_FOR_DELIVERY", items: [{}, {}], total: 30 }, { state: "NEW" }, { id: "o2", status: "Delivered" }]);
    expect(rows).toEqual([
      { id: "o1", status: "out_for_delivery", createdAt: undefined, itemCount: 2, total: 30 },
      { id: "o2", status: "delivered", createdAt: undefined, itemCount: undefined },
    ]);
  });

  it("reads the old tracking answer like the app", () => {
    expect(parseLegacyTracking({ order_id: "o1", state: "ON_THE_WAY", pharmacy_name: "P", total: 12, delivery: { courier_name: "Sam", courier_phone: "0500000000", eta_minutes: 17.4 } })).toEqual({
      id: "o1", state: "on_the_way", pharmacyName: "P", total: 12, courier: { name: "Sam", phone: "0500000000" }, etaMinutes: 17,
    });
    expect(parseLegacyTracking({ state: "NEW" })).toBeNull();
    expect(parseLegacyTracking({ order_id: "o1", state: "NEW", delivery: { eta_minutes: 0 } })?.etaMinutes).toBeUndefined();
  });

  it("the tracking page falls back to it only when the governed read does not know the order", () => {
    const screen = read("components-next/orders/tracking-screen.tsx");
    expect(screen).toContain("order.missing");
    expect(screen).toContain("readLegacyTracking(orderId, token)");
  });
});

describe("the order center filter and the screens that gained parts", () => {
  it("draws a chip per service present, after All", () => {
    const list = read("components-next/orders/order-list.tsx");
    expect(list).toContain("kinds.length > 1");
    expect(list).toContain('t("filterAll")');
  });

  it("the offers page keeps refreshing and offers cancel and notifications with offers listed", () => {
    const screen = read("components-next/pharmacy-offers/offers-screen.tsx");
    expect(screen).toContain("<OffersLiveRefresh active />");
    expect(screen).toContain("<NotificationAsk />");
    expect(screen).toMatch(/browsing && views\.length && progress\.status \? <div className=\{styles\.actions\}><CancelOrder/);
  });

  it("the reorder screen sends a new request without clearing the cart", () => {
    const picker = read("components-next/orders/reorder-picker.tsx");
    expect(picker).toContain("sendCartRequest(");
    expect(picker).toContain("() => undefined");
    expect(picker).toContain("/pharmacy/broadcast-status?orderId=");
  });
});

describe("the suggest-an-edit request", () => {
  it("is allowed as a POST of the product page only", () => {
    expect(isAllowedPatientApiRequest("/medicines/med-1/suggest-change", "POST")).toBe(true);
    expect(isAllowedPatientApiRequest("/medicines/med-1/suggest-change", "GET")).toBe(false);
    expect(isAllowedPatientApiRequest("/medicines/med-1/suggest-change/../x", "POST")).toBe(false);
  });
});
