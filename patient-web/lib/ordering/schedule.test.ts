import { describe, expect, it } from "vitest";
import { chosenGroup, parseChoice } from "./basket";
import { orderingErrorKey } from "./quote";
import { buildBookingRequest, clock, dayKey, evidenceReady, groupByDay, nextDays, orderCovers, parseAsap, parseSchedule, payableNow, whenSummary } from "./schedule";

const w = (h: number, d = 23) => ({ start: new Date(2026, 9, d, h).toISOString(), end: new Date(2026, 9, d, h + 2).toISOString() });

describe("windows by day", () => {
  it("groups the offered windows by local day in the server's order", () => {
    const g = groupByDay([w(8), w(10), w(8, 24)]);
    expect(g.map((x) => x.windows.length)).toEqual([2, 1]);
    expect(g[0].day).toBe(dayKey(w(8).start));
  });
  it("lists the next days starting today", () => {
    expect(nextDays(new Date(2026, 9, 22, 20), 3)).toEqual(["2026-10-22", "2026-10-23", "2026-10-24"]);
  });
});

describe("parseAsap", () => {
  const base = { id: "ab_1", status: "broadcasting", stage: 2, radius_km: 5, seconds_left: 120 };
  it("reads the stage, radius and seconds left", () => {
    expect(parseAsap(base)).toMatchObject({ id: "ab_1", status: "broadcasting", stage: 2, radiusKm: 5, secondsLeft: 120, bookingId: null });
  });
  it("reads the accepted booking and the fallback window after the last stage", () => {
    expect(parseAsap({ ...base, status: "accepted", booking_id: "b1", seconds_left: 0 })?.bookingId).toBe("b1");
    const fb = { earliest_window: { provider_id: "p1", start: "2026-10-23T05:00:00.000Z", end: "2026-10-23T07:00:00.000Z" } };
    expect(parseAsap({ ...base, status: "expired", fallback: fb })?.fallback).toEqual({ providerId: "p1", start: fb.earliest_window.start, end: fb.earliest_window.end });
    expect(parseAsap({ ...base, status: "expired", fallback: { earliest_window: null } })?.fallback).toBeNull();
    expect(parseAsap({ ...base, status: "expired" })?.fallback).toBeUndefined();
  });
  it("refuses an unknown status or a missing id", () => {
    expect(parseAsap({ ...base, status: "weird" })).toBeNull();
    expect(parseAsap({ ...base, id: "" })).toBeNull();
    expect(parseAsap(null)).toBeNull();
  });
  it("formats the countdown", () => {
    expect(clock("en", 125)).toBe("2:05");
    expect(clock("en", -3)).toBe("0:00");
  });
});

describe("schedule storage", () => {
  it("round-trips window, slot and walk-in and drops garbage", () => {
    const s = parseSchedule(JSON.stringify({ quoteId: "q", home: { type: "window", start: "a", end: "b" }, facility: { type: "slot", id: "s", start: "c", end: "d" }, asapId: "x" }));
    expect(s).toEqual({ quoteId: "q", home: { type: "window", start: "a", end: "b" }, facility: { type: "slot", id: "s", start: "c", end: "d" }, asapId: "x" });
    expect(parseSchedule(JSON.stringify({ quoteId: "q", facility: { type: "walk_in" }, home: { type: "bogus" } }))).toEqual({ quoteId: "q", facility: { type: "walk_in" } });
    expect(parseSchedule("nope")).toBeNull();
  });
  it("says nothing for a walk-in", () => { expect(whenSummary("en", { type: "walk_in" })).toBeNull(); });
});

describe("buildBookingRequest", () => {
  const schedule = { quoteId: "oq_1", home: { type: "window" as const, start: "2026-10-23T05:00:00.000Z", end: "2026-10-23T07:00:00.000Z" }, facility: { type: "slot" as const, id: "2026-10-23T06:00:00.000Z", start: "x", end: "y" } };
  it("builds one selection per mode and pays by card when the patient pays", () => {
    expect(buildBookingRequest({ schedule, home: "p1", facility: "p2", insured: false, gender: "female" })).toEqual({
      quote_id: "oq_1", payment_method: "card", gender_preference: "female",
      selections: { home: { provider_id: "p1", window: { start: schedule.home.start, end: schedule.home.end } }, facility: { provider_id: "p2", slot_id: schedule.facility.id } },
    });
  });
  it("sends insurance with the medical order or the uploaded documents", () => {
    expect(buildBookingRequest({ schedule, facility: "p2", insured: true, evidence: { medicalOrderId: "mo1" } })).toMatchObject({ payment_method: "insurance", medical_order_id: "mo1" });
    const docs = [{ kind: "doctor_request" as const, url_or_b64: "data:x", filename: "a.png" }];
    expect(buildBookingRequest({ schedule, facility: "p2", insured: true, evidence: { documents: docs } })).toMatchObject({ documents: docs });
  });
  it("refuses a mode without a time", () => {
    expect(buildBookingRequest({ schedule: { quoteId: "q" }, home: "p1", insured: false })).toBeNull();
    expect(buildBookingRequest({ schedule, insured: false })).toBeNull();
  });
  it("sends walk-in without a slot", () => {
    expect(buildBookingRequest({ schedule: { quoteId: "q", facility: { type: "walk_in" } }, facility: "p2", insured: false })?.selections.facility).toEqual({ provider_id: "p2", walk_in: true });
  });
});

describe("insured evidence", () => {
  it("keeps pay off until an order or a document is attached (insured only)", () => {
    expect(evidenceReady(true, {})).toBe(false);
    expect(evidenceReady(true, { medicalOrderId: "m" })).toBe(true);
    expect(evidenceReady(true, { documents: [{ kind: "doctor_request", url_or_b64: "d" }] })).toBe(true);
    expect(evidenceReady(false, {})).toBe(true);
  });
  it("checks an order covers every item with an open or later lab item", () => {
    const o = { items: [{ group: "labs", catalog_id: "a", status: "open" }, { group: "labs", catalog_id: "b", status: "ordered" }, { group: "radiology", catalog_id: "c", status: "open" }] };
    expect(orderCovers(o, ["a"])).toBe(true);
    expect(orderCovers(o, ["a", "b"])).toBe(false);
    expect(orderCovers(o, [])).toBe(false);
  });
  it("pays now only what is not awaiting approval", () => {
    expect(payableNow({ status: "awaiting_approval" })).toBe(false);
    expect(payableNow({ status: "pending" })).toBe(true);
  });
});

describe("chosen group snapshot and error keys", () => {
  const g = {
    items: [{ catalogId: "a" }, { catalogId: "b" }], split: null,
    bestMatch: { providerId: "p1", lines: [{ catalogId: "a", price: 70 }, { catalogId: "b", price: 70, coverage: "covered" as const }], total: 165, homeFee: 25, estimatedInsuranceShare: 56, patientShare: 109 },
    compare: [{ providerId: "p1", nameAr: "ا", nameEn: "P1", total: 165 }, { providerId: "p2", nameAr: null, nameEn: "P2", total: 180 }],
  };
  it("keeps lines, home fee and shares only for the best match", () => {
    expect(chosenGroup(g, "p1")).toMatchObject({ providerId: "p1", total: 165, homeFee: 25, estimatedInsuranceShare: 56, patientShare: 109, itemIds: ["a", "b"] });
    const other = chosenGroup(g, "p2");
    expect(other).toMatchObject({ providerId: "p2", total: 180 });
    expect(other?.lines).toBeUndefined();
    expect(chosenGroup(g, "nope")).toBeUndefined();
  });
  it("survives storage", () => {
    const raw = JSON.stringify({ quoteId: "q", home: "p1", groups: { home: chosenGroup(g, "p1") } });
    expect(parseChoice(raw)?.groups?.home?.homeFee).toBe(25);
    expect(parseChoice(JSON.stringify({ quoteId: "q", groups: { home: { providerId: 1 } } }))?.groups).toBeUndefined();
  });
  it("maps the booking, window and payment codes", () => {
    for (const [code, key] of [["window_not_offered", "errWindowGone"], ["slot_not_available", "errSlotGone"], ["medical_order_required", "errOrderRequired"], ["booking_already_paid", "errAlreadyPaid"], ["asap_open", "errAsapOpen"], ["quote_already_booked", "errQuoteBooked"], ["nonsense", "errGeneric"]]) expect(orderingErrorKey(code)).toBe(key);
  });
});
