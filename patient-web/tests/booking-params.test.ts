import { describe, expect, it } from "vitest";
import { bookingHref, buildBookingQuery, carriedDayIndex, parseBookingParams, preselectedSlot } from "@/lib/consult/booking-params";
import { localIsoDate } from "@/lib/consult/doctor-schedule";

const now = Date.parse("2026-10-27T10:00:00.000Z");
const start = "2026-10-30T14:30:00.000Z";

describe("booking params", () => {
  it("round trips the visit type and the slot start", () => {
    const query = buildBookingQuery("video", start);
    const raw = Object.fromEntries(new URLSearchParams(query));
    expect(parseBookingParams(raw, now)).toEqual({ type: "video", slotStart: start });
  });
  it("ignores an unreadable, past or missing slot and an unknown type", () => {
    expect(parseBookingParams({ service_type: "video", slot_start: "nonsense" }, now)).toEqual({ type: "video" });
    expect(parseBookingParams({ slot_start: "2026-10-01T09:00:00.000Z" }, now)).toEqual({});
    expect(parseBookingParams({ service_type: "teleport" }, now)).toEqual({});
    expect(parseBookingParams({}, now)).toEqual({});
  });
  it("leaves the slot out of the link when it cannot be read", () => {
    expect(buildBookingQuery("clinic", "bad")).toBe("service_type=clinic");
  });
  it("a chosen chip gives a link with the type and the slot", () => {
    const href = bookingHref("/ar/consultations/book/d1", "home", start);
    expect(href).toContain("/ar/consultations/book/d1?");
    expect(href).toContain("service_type=home");
    expect(href).toContain(`slot_start=${encodeURIComponent(start)}`);
  });
  it("finds the day of the slot in the booking day list, or -1", () => {
    const iso = localIsoDate(new Date(start));
    expect(carriedDayIndex(["2000-01-01", iso], start)).toBe(1);
    expect(carriedDayIndex(["2000-01-01"], start)).toBe(-1);
  });
  it("preselects the slot only when it is among the loaded slots", () => {
    const slots = [{ start: "2026-10-30T14:00:00.000Z" }, { start: "2026-10-30T14:30:00Z" }];
    expect(preselectedSlot(slots, start)).toBe("2026-10-30T14:30:00Z");
    expect(preselectedSlot([slots[0]], start)).toBeNull();
    expect(preselectedSlot(slots, undefined)).toBeNull();
  });
});
