import { describe, expect, it } from "vitest";
import { cycleWindow, parseMaternity, trimesterOf } from "./view";

describe("maternity view", () => {
  it("reads the profile fields and drops values of the wrong type", () => {
    const view = parseMaternity({ data: { profile_ready: true, is_pregnant: true, current_week: 22, due_date: "2027-01-10T00:00:00.000Z", kicks_log: [{ id: "k1", count: 10, duration_seconds: 600, date: "2026-10-01T10:00:00Z" }, { count: "x" }], infant_growth: [{ month: 1, weight_kg: 4.2 }, { month: 3, height_cm: "tall" }] } });
    expect(view).toMatchObject({ ready: true, pregnant: true, week: 22, dueDate: "2027-01-10T00:00:00.000Z" });
    expect(view.kicks).toHaveLength(1);
    expect(view.growth.map((entry) => entry.month)).toEqual([3, 1]);
    expect(view.growth[0]?.heightCm).toBeNull();
  });

  it("is not ready for an empty or malformed answer", () => {
    expect(parseMaternity(null).ready).toBe(false);
    expect(parseMaternity({ profile_ready: false, tracking_mode: null }).week).toBeNull();
  });

  it("splits the trimesters at weeks 13 and 27", () => {
    expect([trimesterOf(13), trimesterOf(14), trimesterOf(27), trimesterOf(28)]).toEqual([1, 2, 2, 3]);
  });

  it("computes the ovulation estimate as last period + cycle - 14 days", () => {
    const window = cycleWindow("2026-01-01T00:00:00.000Z", 28);
    expect(window?.ovulation.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(window?.start.toISOString().slice(0, 10)).toBe("2026-01-10");
    expect(window?.end.toISOString().slice(0, 10)).toBe("2026-01-16");
    expect(window?.next.toISOString().slice(0, 10)).toBe("2026-01-29");
    expect(cycleWindow("nope", 28)).toBeNull();
    expect(cycleWindow("2026-01-01", 5)).toBeNull();
  });
});
