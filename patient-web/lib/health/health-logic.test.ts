import { describe, expect, it } from "vitest";
import { formatTimeKey, takenPercent, type DoseRow } from "./doses";
import { sleepQuality, sleepWeek } from "./sleep";
import { chartPoints, inNormalRange, seriesStats } from "./view";
import { profileBasics } from "./profile";
import { refillOrderId } from "@/components-next/health/reminder-actions";

const dose = (status: DoseRow["status"]): DoseRow => ({ reminder: { id: "r", times: [], chronic: false, active: true, todayDoses: [] }, timeKey: "08:00", status });

describe("doses", () => {
  it("formats an HH:mm key for the reader's clock and leaves anything else alone", () => {
    expect(formatTimeKey("en", "20:05")).toBe("8:05 PM");
    expect(formatTimeKey("en", "nope")).toBe("nope");
  });
  it("counts the taken share as a whole percent", () => {
    expect(takenPercent([])).toBe(0);
    expect(takenPercent([dose("taken"), dose("pending"), dose("pending")])).toBe(33);
    expect(takenPercent([dose("taken")])).toBe(100);
  });
});

describe("sleep", () => {
  it("bands the score as the app does", () => {
    expect(sleepQuality("85")?.key).toBe("excellent");
    expect(sleepQuality(60)?.key).toBe("good");
    expect(sleepQuality(40)?.key).toBe("fair");
    expect(sleepQuality(10)?.tone).toBe("danger");
    expect(sleepQuality(undefined)).toBeNull();
  });
  it("keeps the latest reading of each of the last seven days, oldest first", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const at = (days: number, hour: number) => new Date(now - days * 86400000 - hour * 3600000).toISOString();
    const week = sleepWeek([
      { durationHours: "8", measuredAt: at(0, 0) },
      { durationHours: "5", measuredAt: at(0, 1) },
      { durationHours: "7", measuredAt: at(2, 0) },
      { durationHours: "6", measuredAt: at(30, 0) },
      { measuredAt: at(1, 0) },
    ], now);
    expect(week.map((day) => day.hours)).toEqual([7, 8]);
  });
});

describe("trends", () => {
  it("summarises a series and checks the normal range", () => {
    expect(seriesStats([])).toBeNull();
    expect(seriesStats([2, 4, 9])).toEqual({ max: 9, min: 2, avg: 5, count: 3 });
    expect(inNormalRange(80, [70, 100])).toBe(true);
    expect(inNormalRange(120, [70, 100])).toBe(false);
    expect(inNormalRange(5, undefined)).toBeNull();
  });
  it("places the chart points inside the box and centres a flat series", () => {
    expect(chartPoints([])).toEqual([]);
    expect(chartPoints([5, 5, 5]).every(([, y]) => y === 20)).toBe(true);
    const [first, , last] = chartPoints([1, 5, 9]);
    expect(first).toEqual([0, 36]);
    expect(last).toEqual([100, 4]);
  });
});

describe("profile basics and refill answers", () => {
  it("reads gender and the three switches, and drops a gender it does not know", () => {
    expect(profileBasics({ gender: "female", is_smoker: true })).toMatchObject({ gender: "female", isSmoker: true, isPregnant: false, isBreastfeeding: false });
    expect(profileBasics({ gender: "other" }).gender).toBeUndefined();
  });
  it("accepts only a server-created refill order", () => {
    expect(refillOrderId({ ok: true, order_id: "abc" })).toBe("abc");
    expect(refillOrderId({ ok: false, order_id: "abc" })).toBeNull();
    expect(refillOrderId({ ok: true })).toBeNull();
    expect(refillOrderId(null)).toBeNull();
  });
});
