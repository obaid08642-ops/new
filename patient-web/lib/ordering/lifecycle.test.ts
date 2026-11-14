import { describe, expect, it } from "vitest";
import { awaitingChoice, isCancelled, lifecycleErrorKey, parseApproval, parseBookingView, parseChoiceAnswer, parseEmergency, parseReminders, parseVisit, paymentKey, secondsUntil, statusKey, stepsOf } from "./lifecycle";

const view = (extra: Record<string, unknown> = {}) => ({
  id: "b1", status: "pending", state: "NEW_REQUEST", mode: "home", total: 165, price_locked_at: null, items: [{ catalog_id: "a", price: 70 }, { catalog_id: "b", price: 95 }],
  confirm_deadline_at: "2026-10-23T10:05:00.000Z", payment: { amount: 165, status: "paid", refund_status: null }, alternative: null, ...extra,
});

describe("parseBookingView", () => {
  it("reads the booking, the payment and the deadline as the server sent them", () => {
    const b = parseBookingView(view())!;
    expect(b).toMatchObject({ id: "b1", mode: "home", total: 165, confirmDeadlineAt: "2026-10-23T10:05:00.000Z", payment: { amount: 165, status: "paid", refundStatus: null } });
    expect(b.items).toEqual([{ catalogId: "a", price: 70 }, { catalogId: "b", price: 95 }]);
  });
  it("reads the alternative of an expired confirmation and rejects an incomplete one", () => {
    expect(parseBookingView(view({ status: "cancelled", alternative: { provider_id: "p2", total: 170, earliest_at: "2026-10-24T08:00:00.000Z" } }))!.alternative).toEqual({ providerId: "p2", total: 170, earliestAt: "2026-10-24T08:00:00.000Z" });
    expect(parseBookingView(view({ alternative: { provider_id: "p2" } }))!.alternative).toBeNull();
  });
  it("refuses an answer without an id and unwraps a data envelope", () => {
    expect(parseBookingView({ status: "pending" })).toBeNull();
    expect(parseBookingView(null)).toBeNull();
    expect(parseBookingView({ data: view() })!.id).toBe("b1");
  });
});

describe("secondsUntil", () => {
  const t0 = new Date("2026-10-23T10:00:00.000Z").getTime();
  it("counts down to the deadline and stops at 0", () => {
    expect(secondsUntil("2026-10-23T10:05:00.000Z", t0)).toBe(300);
    expect(secondsUntil("2026-10-23T09:59:00.000Z", t0)).toBe(0);
    expect(secondsUntil(null, t0)).toBeNull();
    expect(secondsUntil("nonsense", t0)).toBeNull();
  });
});

describe("statuses and steps", () => {
  it("names the status line and never shows a raw code", () => {
    expect(statusKey(parseBookingView(view())!)).toBe("StPending");
    expect(statusKey(parseBookingView(view({ confirm_deadline_at: null }))!)).toBe("StConfirmed");
    expect(statusKey(parseBookingView(view({ status: "awaiting_approval" }))!)).toBe("StApproval");
    expect(statusKey(parseBookingView(view({ status: "weird" }))!)).toBe("StOther");
    expect(statusKey(parseBookingView(view({ status: "cancelled" }))!)).toBe("StCancelled");
    expect(isCancelled(parseBookingView(view({ status: "pending", state: "CANCELLED" }))!)).toBe(true);
  });
  it("marks the provider confirmation as the current step of a paid cash booking", () => {
    expect(stepsOf(parseBookingView(view())!, false, null)).toEqual([{ key: "paid", state: "done" }, { key: "confirm", state: "now" }, { key: "visit", state: "next" }]);
    expect(stepsOf(parseBookingView(view({ confirm_deadline_at: null, status: "in_service" }))!, false, null).map((s) => s.state)).toEqual(["done", "done", "done"]);
  });
  it("puts insurance approval between the confirmation and the visit for an insured booking", () => {
    const a = parseApproval({ status: "pending", items: [], final: false })!;
    expect(stepsOf(parseBookingView(view({ confirm_deadline_at: null, status: "awaiting_approval" }))!, true, a)).toEqual([{ key: "confirm", state: "done" }, { key: "insurance", state: "now" }, { key: "visit", state: "next" }]);
  });
  it("maps payment statuses and error codes", () => {
    expect(paymentKey("paid")).toBe("PayPaid");
    expect(paymentKey("failed")).toBeNull();
    expect(lifecycleErrorKey("choice_not_pending")).toBe("partErrDone");
    expect(lifecycleErrorKey("nothing_covered")).toBe("partErrNothing");
    expect(lifecycleErrorKey("surprise")).toBe("errGeneric");
  });
});

describe("parseApproval", () => {
  const partial = {
    status: "partial", final: false, patient_share_total: 130, home_fee: { amount: 30, covered: false }, valid_until: "2026-10-24T10:00:00.000Z",
    warning: "approval_expires_before_visit", rebook_earlier: true, choices: ["pay_difference", "covered_only", "cancel_free", "bogus"],
    items: [{ catalog_id: "a", decision: "approved", price: 100, coverage: "covered", insurer_share: 90, patient_share: 10 }, { catalog_id: "b", decision: "rejected", price: 90, coverage: "needs_approval", insurer_share: 0, patient_share: 90 }],
  };
  it("keeps the server shares, the warning and only the known choices", () => {
    const a = parseApproval(partial)!;
    expect(a.patientShareTotal).toBe(130);
    expect(a.items.map((i) => [i.decision, i.insurerShare, i.patientShare])).toEqual([["approved", 90, 10], ["rejected", 0, 90]]);
    expect(a.homeFee).toEqual({ amount: 30, covered: false });
    expect(a.expiresBeforeVisit).toBe(true);
    expect(a.choices).toEqual(["pay_difference", "covered_only", "cancel_free"]);
    expect(awaitingChoice(a)).toBe(true);
  });
  it("does not ask for a choice once it is final or when the request is approved", () => {
    expect(awaitingChoice(parseApproval({ ...partial, final: true, choices: undefined }))).toBe(false);
    expect(awaitingChoice(parseApproval({ status: "approved", final: true, items: [] }))).toBe(false);
    expect(awaitingChoice(null)).toBe(false);
  });
  it("reads the pre-decision estimate and refuses an unknown status", () => {
    const p = parseApproval({ status: "pending", estimate: true, final: false, estimated_patient_share_total: 55, patient_share_total: null, items: [{ catalog_id: "a", decision: "pending", price: 70, estimated_patient_share: 14 }] })!;
    expect(p.estimatedShareTotal).toBe(55);
    expect(p.patientShareTotal).toBeNull();
    expect(p.items[0].estimatedShare).toBe(14);
    expect(parseApproval({ status: "odd" })).toBeNull();
  });
  it("answers of the choice", () => {
    expect(parseChoiceAnswer({ choice: "covered_only", patient_share_total: 10 })).toEqual({ choice: "covered_only", patientShareTotal: 10 });
    expect(parseChoiceAnswer({ choice: "x" })).toBeNull();
  });
});

describe("visit, reminders, emergency", () => {
  it("reads the staff, the licence and a 4-digit arrival code only", () => {
    const v = parseVisit({ status: "assigned", provider: { id: "p", name_ar: "ا", name_en: "Lab", license: "L-1", photo_url: "https://cdn/x.png" }, staff: { id: "s", name: "Khalid", license: "SC-1", photo_url: "http://insecure/x.png", gender: "male" }, arrival_code: "0427" })!;
    expect(v.staff).toEqual({ name: "Khalid", license: "SC-1", photoUrl: null });
    expect(v.provider.photoUrl).toBe("https://cdn/x.png");
    expect(v.arrivalCode).toBe("0427");
    expect(parseVisit({ status: "pending", provider: {}, arrival_code: "12" })!.arrivalCode).toBeNull();
    expect(parseVisit({ status: "pending", provider: {} })!.staff).toBeNull();
  });
  it("keeps valid reminders only", () => {
    expect(parseReminders({ reminders: [{ kind: "fasting_night", at: "2026-10-23T17:00:00.000Z" }, { kind: "x", at: "2026-10-23T17:00:00.000Z" }, { kind: "preparation", at: "bad" }] })).toEqual([{ kind: "fasting_night", at: "2026-10-23T17:00:00.000Z" }]);
    expect(parseReminders(null)).toEqual([]);
  });
  it("accepts a phone number of digits and plus only", () => {
    expect(parseEmergency({ call: "997" })).toEqual({ call: "997" });
    expect(parseEmergency({ call: "tel:997;rm" })).toBeNull();
  });
});
