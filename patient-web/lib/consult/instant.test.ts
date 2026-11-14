import { describe, expect, it } from "vitest";
import { clockText, instantErrorKey, instantOpen, parseInstant } from "./instant";
import { parseResultValues } from "../ordering/results";

describe("parseInstant", () => {
  it("reads a broadcasting request as the server sent it", () => {
    const i = parseInstant({ id: "a1", status: "broadcasting", specialty: "cardiology", mode: "video", seconds_left: 170, expires_at: "2026-10-22T10:00:00Z", doctors_notified: 2, payment_status: "not_charged" });
    expect(i).toMatchObject({ id: "a1", status: "broadcasting", secondsLeft: 170, doctorsNotified: 2, paymentStatus: "not_charged", fallback: null });
    expect(i && instantOpen(i)).toBe(true);
  });
  it("reads accepted with the appointment", () => {
    expect(parseInstant({ id: "a1", status: "accepted", accepted_by: "d1", appointment_id: "p1", seconds_left: 0 })).toMatchObject({ acceptedBy: "d1", appointmentId: "p1" });
  });
  it("reads the expired fallback with no earliest slot", () => {
    const i = parseInstant({ id: "a1", status: "expired", fallback: { options: ["earliest_slot", "refund", "x"], earliest_slot: null } });
    expect(i?.fallback).toEqual({ options: ["earliest_slot", "refund"], earliestSlot: null });
  });
  it("reads an earliest slot", () => {
    expect(parseInstant({ id: "a1", status: "expired", fallback: { options: [], earliest_slot: { doctor_id: "d", starts_at: "2026-10-23T09:00:00Z" } } })?.fallback?.earliestSlot).toEqual({ doctorId: "d", startsAt: "2026-10-23T09:00:00Z" });
  });
  it("rejects unknown status or missing id", () => {
    expect(parseInstant({ id: "a", status: "weird" })).toBeNull();
    expect(parseInstant({ status: "accepted" })).toBeNull();
    expect(parseInstant(null)).toBeNull();
  });
});

describe("helpers", () => {
  it("maps stable codes", () => {
    expect(instantErrorKey("instant_no_online_doctors")).toBe("errNoDoctors");
    expect(instantErrorKey("instant_request_open")).toBe("errOpen");
    expect(instantErrorKey("zzz")).toBe("errGeneric");
  });
  it("formats the clock", () => {
    expect(clockText("en", 125)).toBe("2:05");
    expect(clockText("en", -4)).toBe("0:00");
  });
  it("parses result values with ranges", () => {
    const v = parseResultValues({ values: [{ catalog_id: "hb", name: "Hb", value: 11.2, unit: "g/dL", range: { low: 12, high: 16 }, flag: "low", trend: [] }, { bad: 1 }] });
    expect(v).toEqual([{ catalogId: "hb", name: "Hb", value: 11.2, unit: "g/dL", low: 12, high: 16, flag: "low", trend: [] }]);
  });
});
