import { describe, expect, it } from "vitest";
import { canReportNoShow, noShowOpensAt, readNoShowOutcome } from "./provider-no-show";

const START = "2026-11-09T10:00:00Z";
const at = (minutes: number) => Date.parse(START) + minutes * 60_000;

describe("the doctor did not come", () => {
  it("is offered 10 minutes after the start, not before", () => {
    expect(canReportNoShow("CONFIRMED", START, at(9.9))).toBe(false);
    expect(canReportNoShow("CONFIRMED", START, at(10))).toBe(true);
    expect(canReportNoShow("confirmed", START, at(45))).toBe(true);
  });
  it("only for a visit that never started: confirmed, checked in, en route", () => {
    for (const status of ["confirmed", "checked_in", "en_route"]) expect(canReportNoShow(status, START, at(20))).toBe(true);
    for (const status of ["in_progress", "completed", "cancelled", "no_show", "pending", "pending_payment", "arrived", "", undefined]) expect(canReportNoShow(status, START, at(20))).toBe(false);
  });
  it("never without a readable start time", () => {
    expect(canReportNoShow("confirmed", undefined, at(20))).toBe(false);
    expect(canReportNoShow("confirmed", "not a date", at(20))).toBe(false);
    expect(noShowOpensAt("confirmed", "x")).toBeNull();
    expect(noShowOpensAt("in_progress", START)).toBeNull();
    expect(noShowOpensAt("confirmed", START)).toBe(at(10));
  });
});

describe("what the report did (owner decision 2026-11-10)", () => {
  it("reads refunded, held with its date, pending review, and the old answer without a status as refunded", () => {
    expect(readNoShowOutcome({ ok: true, status: "refunded" })).toEqual({ status: "refunded", refundAfter: null });
    expect(readNoShowOutcome({ ok: true })).toEqual({ status: "refunded", refundAfter: null });
    expect(readNoShowOutcome({ status: "held", refund_after: "2026-11-11T10:00:00.000Z" })).toEqual({ status: "held", refundAfter: "2026-11-11T10:00:00.000Z" });
    expect(readNoShowOutcome({ status: "held", refund_after: "not a date" })).toEqual({ status: "held", refundAfter: null });
    expect(readNoShowOutcome({ status: "pending_review" })).toEqual({ status: "pending_review", refundAfter: null });
    expect(readNoShowOutcome(null)).toEqual({ status: "refunded", refundAfter: null });
  });
});
