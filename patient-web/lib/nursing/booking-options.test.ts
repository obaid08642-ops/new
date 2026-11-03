import { describe, expect, it } from "vitest";
import { bookingErrorKey, choiceFields, defaultChoice, normalizeChoice, parseBookingOptions, parseNursingQuote, quotePath } from "./booking-options";
import { isAllowedPatientApiTarget } from "@/lib/api/patient-allowlist";
import { extractHomeCareService } from "@/lib/api/home-care-services";

const continuous = parseBookingOptions("continuous", { hours: [12, 4, 24], shift: ["night", "day"], period: ["day", "days", "week"], max_days: 14 })!;
const visit = parseBookingOptions("visit", { recurrence: ["once", "daily", "weekly"], max_times: 10 })!;

describe("parseBookingOptions", () => {
  it("keeps only what the server offers, in a stable order", () => {
    expect(continuous).toEqual({ mode: "continuous", hours: [4, 12, 24], shift: ["day", "night"], period: ["day", "days", "week"], maxDays: 14 });
    expect(parseBookingOptions("programme", { sessions: [10, 5, 5] })).toEqual({ mode: "programme", sessions: [5, 10] });
  });
  it("returns null for an unknown mode, empty lists or bad values", () => {
    expect(parseBookingOptions("other", {})).toBeNull();
    expect(parseBookingOptions("visit", { recurrence: [] })).toBeNull();
    expect(parseBookingOptions("visit", { recurrence: ["hourly"] })).toBeNull();
    expect(parseBookingOptions("continuous", { hours: [4], shift: ["day"] })).toBeNull();
    expect(parseBookingOptions("programme", { sessions: [0] })).toBeNull();
    expect(parseBookingOptions("visit", null)).toBeNull();
  });
  it("is read from a service record", () => {
    const service = extractHomeCareService({ id: "s1", name: "Care", booking_mode: "visit", booking_options: { recurrence: ["once", "daily"], max_times: 7 } });
    expect(service?.bookingOptions).toEqual({ mode: "visit", recurrence: ["once", "daily"], maxTimes: 7 });
    expect(extractHomeCareService({ id: "s2", name: "Care" })?.bookingOptions).toBeUndefined();
  });
});

describe("choice", () => {
  it("defaults to values the server offers", () => {
    expect(defaultChoice(visit)).toEqual({ mode: "visit", recurrence: "once", times: 1 });
    expect(defaultChoice(continuous)).toEqual({ mode: "continuous", hours: 4, shift: "day", period: "day", days: 1 });
  });
  it("sends once as one time and days only for the period days", () => {
    expect(choiceFields({ mode: "visit", recurrence: "once", times: 5 })).toEqual({ recurrence: "once", sessions_count: 1 });
    expect(choiceFields({ mode: "visit", recurrence: "weekly", times: 4 })).toEqual({ recurrence: "weekly", sessions_count: 4 });
    expect(choiceFields({ mode: "continuous", hours: 12, shift: "night", period: "week", days: 5 })).toEqual({ hours: 12, shift: "night", period: "week" });
    expect(choiceFields({ mode: "continuous", hours: 12, shift: "night", period: "days", days: 5 })).toEqual({ hours: 12, shift: "night", period: "days", days: 5 });
    expect(choiceFields({ mode: "programme", sessions: 6 })).toEqual({ sessions_count: 6 });
  });
  it("normalises a stale choice against the options", () => {
    expect(normalizeChoice(visit, { mode: "visit", recurrence: "monthly", times: 99 })).toEqual({ mode: "visit", recurrence: "once", times: 1 });
    expect(normalizeChoice(visit, { mode: "visit", recurrence: "daily", times: 99 })).toEqual({ mode: "visit", recurrence: "daily", times: 10 });
    expect(normalizeChoice(continuous, { mode: "continuous", hours: 8, shift: "day", period: "days", days: 40 })).toEqual({ mode: "continuous", hours: 4, shift: "day", period: "days", days: 14 });
    expect(normalizeChoice(continuous, { mode: "continuous", hours: 12, shift: "night", period: "week", days: 9 })).toEqual({ mode: "continuous", hours: 12, shift: "night", period: "week", days: 1 });
  });
});

describe("quote", () => {
  it("builds the quote request from the choice and the proxy allows it", () => {
    const path = quotePath("svc-1", "nurse-1", { mode: "continuous", hours: 12, shift: "day", period: "days", days: 3 });
    expect(path).toBe("/api/patient/bookings/quote?kind=nursing&service_id=svc-1&provider_id=nurse-1&hours=12&shift=day&period=days&days=3");
    const [p, q] = path.replace("/api/patient", "").split("?");
    expect(isAllowedPatientApiTarget(p, `?${q}`, "GET")).toBe(true);
    expect(isAllowedPatientApiTarget(p, `?${q}&kind=lab`, "GET")).toBe(false);
    expect(isAllowedPatientApiTarget(p, "?kind=lab&service_id=a&provider_id=b", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget(p, `?${q}`, "POST")).toBe(false);
  });
  it("reads unit price, billable units and total from the server only", () => {
    expect(parseNursingQuote({ lines: [{ unit_price: 50, qty: 3 }], total: 172.5, booking: { billable_units: 3, unit_price: 50 } })).toEqual({ unitPrice: 50, billableUnits: 3, total: 172.5 });
    expect(parseNursingQuote({ data: { lines: [{ unit_price: 10 }], total: 10, booking: { billable_units: 1 } } })).toEqual({ unitPrice: 10, billableUnits: 1, total: 10 });
    expect(parseNursingQuote({ total: 10 })).toBeNull();
    expect(parseNursingQuote({ lines: [{ unit_price: 10 }], booking: { billable_units: 1 } })).toBeNull();
    expect(parseNursingQuote(null)).toBeNull();
  });
});

describe("bookingErrorKey", () => {
  it("maps every code of the contract to a message key", () => {
    const codes = ["booking_mode_mismatch", "booking_options_required", "booking_hours_not_offered", "booking_shift_not_offered", "booking_period_not_offered", "booking_days_out_of_range", "booking_recurrence_not_offered", "booking_times_need_recurrence", "booking_times_out_of_range", "booking_sessions_not_offered", "service_price_not_set"];
    for (const code of codes) expect(bookingErrorKey(code)).toMatch(/^err[A-Z]/);
    expect(bookingErrorKey("booking_hours_not_offered")).toBe("errBookingHoursNotOffered");
    expect(bookingErrorKey("other")).toBeNull();
  });
});
