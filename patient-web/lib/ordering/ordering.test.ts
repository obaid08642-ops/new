import { describe, expect, it } from "vitest";
import { addLine, emptyBasket, hasLine, MAX_BASKET_ITEMS, parseBasket, parseChoice, removeLine, serializeBasket } from "./basket";
import { parseBookingResult } from "./bookings";
import { contextQuery, payOf, placeOf, pointFromAddresses } from "./context";
import { filterCompare, orderingErrorKey, parseQuote, summarize } from "./quote";
import { parseResultValues, rangeGeometry } from "./results";
import { parseWindows } from "./windows";

const row = (id: string, total: number, extra: Record<string, unknown> = {}) => ({ provider_id: id, name_ar: "ا", name_en: id, total, distance_km: 2.5, rating: 4.5, in_network: true, earliest_at: "2026-10-23T10:00:00.000Z", turnaround_hours: 24, ...extra });
const quoteBody = {
  quote_id: "oq_1", expires_at: "2026-10-23T12:00:00.000Z", estimate: true,
  groups: [
    { mode: "home", items: [{ catalog_id: "a" }, { catalog_id: "b" }], from_price: { total: 165, providers_count: 3 },
      best_match: { ...row("p1", 165, { home_fee: 25, vat_rate: 0.15, vat: 21.52, subtotal: 143.48 }), items: [{ catalog_id: "a", price: 70, coverage: "covered" }, { catalog_id: "b", price: 70, coverage: "not_covered" }], estimated_insurance_share: 56, patient_share: 109 },
      compare: [row("p1", 165), row("p2", 180, { covers_all: false, missing: ["b"] })], split_suggestion: null, empty: null },
    { mode: "facility", items: [{ catalog_id: "c", facility_only: true }], from_price: null, best_match: null, compare: [],
      split_suggestion: { assignments: [{ provider_id: "p3", catalog_ids: ["c"] }], total: 450 },
      empty: { reason: "no_provider", alternatives: [{ type: "facility_nearby", providers_count: 3, nearest_km: 4.2 }, { type: "broadcast" }, { type: "bogus" }] } },
  ],
  from_price: null,
};

describe("parseQuote", () => {
  const q = parseQuote(quoteBody)!;
  it("reads groups, lines, coverage and the facility-only flag", () => {
    expect(q.quoteId).toBe("oq_1");
    expect(q.estimate).toBe(true);
    expect(q.groups.map((g) => g.mode)).toEqual(["home", "facility"]);
    expect(q.groups[0].bestMatch?.lines[1]).toEqual({ catalogId: "b", price: 70, coverage: "not_covered" });
    expect(q.groups[0].bestMatch?.patientShare).toBe(109);
    expect(q.groups[1].items[0]).toEqual({ catalogId: "c", facilityOnly: true });
  });
  it("marks partial providers and lists what they lack", () => {
    expect(q.groups[0].compare[0].coversAll).toBe(true);
    expect(q.groups[0].compare[1]).toMatchObject({ coversAll: false, missing: ["b"] });
  });
  it("reads the split and the empty alternatives, dropping unknown ones", () => {
    expect(q.groups[1].split).toEqual({ assignments: [{ providerId: "p3", catalogIds: ["c"] }], total: 450 });
    expect(q.groups[1].empty?.alternatives).toEqual([{ type: "facility_nearby", providersCount: 3, nearestKm: 4.2 }, { type: "broadcast" }]);
  });
  it("rejects an answer without an id or groups", () => {
    expect(parseQuote(null)).toBeNull();
    expect(parseQuote({ groups: [] })).toBeNull();
    expect(parseQuote({ quote_id: "x" })).toBeNull();
  });
});

describe("summarize", () => {
  it("sums the server's lines, takes the home fee the server states and flags a group without a best match", () => {
    const s = summarize(parseQuote(quoteBody)!.groups);
    expect(s).toEqual({ itemsTotal: 140, homeFee: 25, insuranceShare: 56, patientShare: 109, total: 109, complete: false });
  });
  it("is complete when every group has a best match", () => {
    expect(summarize(parseQuote(quoteBody)!.groups.slice(0, 1)).complete).toBe(true);
    expect(summarize([]).complete).toBe(false);
  });
});

describe("errors and filters", () => {
  it("maps stable codes to message keys, anything else to the generic one", () => {
    expect(orderingErrorKey("unknown_catalog_item")).toBe("errUnknownItem");
    expect(orderingErrorKey("insurance_not_saved")).toBe("errInsuranceNotSaved");
    expect(orderingErrorKey("quote_expired")).toBe("errQuoteExpired");
    expect(orderingErrorKey("whatever")).toBe("errGeneric");
    expect(orderingErrorKey(undefined)).toBe("errGeneric");
  });
  it("filters the compare list to the patient's network", () => {
    const rows = parseQuote({ ...quoteBody, groups: [{ mode: "home", items: [], compare: [row("p1", 1), row("p2", 2, { in_network: false })] }] })!.groups[0].compare;
    expect(filterCompare(rows, { inNetworkOnly: true }).map((r) => r.providerId)).toEqual(["p1"]);
    expect(filterCompare(rows, { inNetworkOnly: false })).toHaveLength(2);
  });
});

describe("basket", () => {
  it("adds once, removes, and keeps the kinds apart", () => {
    let b = addLine(emptyBasket(), "lab", { id: "t1", nameEn: "CBC" });
    b = addLine(b, "lab", { id: "t1" });
    b = addLine(b, "radiology", { id: "r1" });
    expect(b.lab).toHaveLength(1);
    expect(hasLine(b, "radiology", "r1")).toBe(true);
    expect(hasLine(b, "lab", "r1")).toBe(false);
    expect(removeLine(b, "lab", "t1").lab).toEqual([]);
  });
  it("refuses an id the quote endpoint would refuse and a 31st item", () => {
    expect(addLine(emptyBasket(), "lab", { id: "bad id!" }).lab).toEqual([]);
    let b = emptyBasket();
    for (let i = 0; i < MAX_BASKET_ITEMS + 5; i++) b = addLine(b, "lab", { id: `t${i}` });
    expect(b.lab).toHaveLength(MAX_BASKET_ITEMS);
  });
  it("round-trips through storage and survives garbage", () => {
    const b = addLine(emptyBasket(), "nursing", { id: "n1", nameAr: "ع" });
    expect(parseBasket(serializeBasket(b))).toEqual(b);
    expect(parseBasket("{not json")).toEqual(emptyBasket());
    expect(parseBasket(null)).toEqual(emptyBasket());
    expect(parseBasket(JSON.stringify({ lab: [{ id: "x y" }, { id: "ok" }, { id: "ok" }] })).lab.map((l) => l.id)).toEqual(["ok"]);
  });
  it("reads the provider choice", () => {
    expect(parseChoice(JSON.stringify({ quoteId: "q", home: "p1" }))).toEqual({ quoteId: "q", home: "p1", facility: undefined });
    expect(parseChoice("nope")).toBeNull();
  });
});

describe("context", () => {
  it("takes the default address's point, else the first one with coordinates", () => {
    expect(pointFromAddresses([{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4, is_default: true }])).toEqual({ lat: 3, lng: 4 });
    expect(pointFromAddresses([{ label: "x" }, { latitude: 5, longitude: 6 }])).toEqual({ lat: 5, lng: 6 });
    expect(pointFromAddresses({ addresses: [{ latitude: 7, longitude: 8 }] })).toEqual({ lat: 7, lng: 8 });
    expect(pointFromAddresses([{ lat: 24.7, lng: 46.6, is_default: true }])).toEqual({ lat: 24.7, lng: 46.6 });
    expect(pointFromAddresses([{ label: "x" }])).toBeNull();
    expect(pointFromAddresses(null)).toBeNull();
  });
  it("keeps place and payment in the query, defaults left out", () => {
    expect(placeOf("facility")).toBe("facility");
    expect(placeOf("x")).toBe("home");
    expect(payOf("insurance")).toBe("insurance");
    expect(payOf("self_pay")).toBe("cash");
    expect(contextQuery({ place: "home", pay: "cash" })).toBe("");
    expect(contextQuery({ kind: "radiology", place: "facility", pay: "insurance" })).toBe("?kind=radiology&place=facility&pay=insurance");
  });
});

describe("windows and bookings", () => {
  it("reads the three window answers", () => {
    expect(parseWindows({ windows: [{ asap: true }, { start: "a", end: "b" }] })).toEqual({ kind: "home", asap: true, windows: [{ start: "a", end: "b" }] });
    expect(parseWindows({ walk_in: true, qr: true })).toEqual({ kind: "walk_in", qr: true });
    expect(parseWindows({ date: "2026-10-23", slots: [{ id: "s1", start: "a", end: "b" }, { id: "" }] })).toEqual({ kind: "slots", date: "2026-10-23", slots: [{ id: "s1", start: "a", end: "b" }] });
    expect(parseWindows({})).toBeNull();
  });
  it("reads a booking group", () => {
    const r = parseBookingResult({ order_group_id: "og_1", bookings: [{ id: "b1", mode: "home", status: "awaiting_approval", provider_id: "p1", total: 165, items: [{ catalog_id: "a", price: 70, coverage: "needs_approval" }] }, { id: "bad" }], payment: { amount: 165, status: "pending" } });
    expect(r?.orderGroupId).toBe("og_1");
    expect(r?.bookings).toHaveLength(1);
    expect(r?.bookings[0].items[0].coverage).toBe("needs_approval");
    expect(r?.payment).toEqual({ amount: 165, status: "pending" });
    expect(parseBookingResult({ order_group_id: "x" })).toBeNull();
  });
});

describe("results (Ord11)", () => {
  it("keeps the server's flag and trend and places the value on the range bar", () => {
    const [v] = parseResultValues({ values: [{ catalog_id: "a", name: "A", value: 12.4, unit: "u", range: { low: 4, high: 11 }, flag: "high", trend: [{ date: "2026-01-01", value: 9 }, { date: "x" }] }] });
    expect(v.flag).toBe("high");
    expect(v.trend).toEqual([{ date: "2026-01-01", value: 9 }]);
    expect(rangeGeometry({ value: 7.5, low: 4, high: 11 })?.marker).toBeCloseTo(50);
    expect(rangeGeometry({ value: 100, low: 4, high: 11 })?.marker).toBe(100);
    expect(rangeGeometry({ value: 1, low: null, high: 5 })).toBeNull();
  });
});
