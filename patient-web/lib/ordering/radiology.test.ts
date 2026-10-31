import { describe, expect, it, vi } from "vitest";
import { bookingPath, buildRadiologyRequests, createRadiologyBookings } from "./radiology";
import { orderingErrorKey } from "./quote";
import type { Schedule } from "./schedule";

const schedule: Schedule = {
  quoteId: "oq_1",
  home: { type: "window", start: "2030-01-02T08:00:00.000Z", end: "2030-01-02T10:00:00.000Z" },
  facility: { type: "slot", id: "s1", start: "2030-01-03T09:00:00.000Z", end: "2030-01-03T09:30:00.000Z" },
};
const groups = { home: { itemIds: ["scan-a"] }, facility: { itemIds: ["scan-b", "scan-c"] } };

describe("radiology baskets are booked on the radiology route", () => {
  it("makes one request per scan and place, with the provider the quote named, the chosen time and how the patient pays", () => {
    const reqs = buildRadiologyRequests({ schedule, home: "p-home", facility: "p-fac", groups, insured: false })!;
    expect(reqs.map((r) => [r.mode, r.body.service_id, r.body.provider_id, r.body.scheduled_at, r.body.location_type, r.body.payment_method])).toEqual([
      ["home", "scan-a", "p-home", "2030-01-02T08:00:00.000Z", "home", "card"],
      ["facility", "scan-b", "p-fac", "2030-01-03T09:00:00.000Z", "facility", "card"],
      ["facility", "scan-c", "p-fac", "2030-01-03T09:00:00.000Z", "facility", "card"],
    ]);
  });

  it("a walk-in is booked for now; an insured basket sends the doctor's request and no price", () => {
    const now = new Date("2030-02-01T10:00:00.000Z");
    const [r] = buildRadiologyRequests({ schedule: { quoteId: "q", facility: { type: "walk_in" } }, facility: "p", groups: { facility: { itemIds: ["scan-b"] } }, insured: true, evidence: { documents: [{ kind: "doctor_request", url_or_b64: "data:x", filename: "r.jpg" }] }, now })!;
    expect(r.body).toEqual({ service_id: "scan-b", provider_id: "p", scheduled_at: now.toISOString(), location_type: "facility", payment_method: "insurance", documents: [{ kind: "doctor_request", url_or_b64: "data:x", filename: "r.jpg" }] });
    expect(JSON.stringify(r.body)).not.toMatch(/price|total|amount/);
  });

  it("is null while a place has no time or no scan", () => {
    expect(buildRadiologyRequests({ schedule: { quoteId: "q" }, home: "p", groups, insured: false })).toBeNull();
    expect(buildRadiologyRequests({ schedule, home: "p", groups: { home: { itemIds: [] } }, insured: false })).toBeNull();
  });

  it("answers in the shape of an ordering group: radiology bookings with the server's totals, awaiting approval when insured", async () => {
    const post = vi.fn(async (b: { service_id: string }) => ({ id: `rb-${b.service_id}`, total: 120 }));
    const cash = await createRadiologyBookings(buildRadiologyRequests({ schedule, home: "p-home", facility: "p-fac", groups, insured: false })!, post);
    expect(cash.bookings.map((b) => [b.id, b.kind, b.status, b.total])).toEqual([["rb-scan-a", "radiology", "pending", 120], ["rb-scan-b", "radiology", "pending", 120], ["rb-scan-c", "radiology", "pending", 120]]);
    expect(cash.payment).toEqual({ amount: 360, status: "pending" });
    const insured = await createRadiologyBookings(buildRadiologyRequests({ schedule, home: "p-home", groups: { home: { itemIds: ["scan-a"] } }, insured: true })!, post);
    expect(insured.bookings[0].status).toBe("awaiting_approval");
  });

  it("an answer without an id or total is refused, and a failure stops the split", async () => {
    await expect(createRadiologyBookings(buildRadiologyRequests({ schedule, home: "p", groups: { home: { itemIds: ["a"] } }, insured: false })!, async () => ({}))).rejects.toThrow("bad_answer");
    const post = vi.fn().mockResolvedValueOnce({ id: "rb-1", total: 10 }).mockRejectedValueOnce(new Error("slot_expired"));
    await expect(createRadiologyBookings(buildRadiologyRequests({ schedule, facility: "p", groups: { facility: { itemIds: ["a", "b", "c"] } }, insured: false })!, post)).rejects.toThrow("slot_expired");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("follows a radiology booking on its booking page and a lab booking on the ordering page; the radiology codes read in the localized words", () => {
    expect(bookingPath("en", { id: "rb-1", kind: "radiology" })).toBe("/en/diagnostics/bookings/radiology/rb-1");
    expect(bookingPath("en", { id: "b-1" })).toBe("/en/labs/bookings/b-1");
    expect(orderingErrorKey("provider_cannot_perform_scan")).toBe("errModeNotOffered");
    expect(orderingErrorKey("slot_expired")).toBe("errSlotGone");
    expect(orderingErrorKey("payment_method_cash_not_allowed_for_home_visit")).toBe("errCashHome");
    expect(orderingErrorKey("insurance_home_requires_doctor_request_or_preauth")).toBe("errOrderRequired");
    expect(orderingErrorKey("service_kind_not_bookable_yet")).toBe("errModeNotOffered");
  });
});
