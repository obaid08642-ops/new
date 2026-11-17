import { describe, expect, it } from "vitest";
import { riyadhDayKey, riyadhDays, riyadhNoon, riyadhWall } from "../lib/time/riyadh";
import { dayKey, dayText, groupByDay, nextDays, rangeText, slotText, whenSummary } from "../lib/ordering/schedule";

// The backend cuts lab, radiology and home-care slots by Riyadh clock time (UTC+3, common/riyadh-slots.ts): `start` is a real instant,
// the day of a request is the Riyadh calendar day. The picker must show and ask for exactly that, in any browser time zone.
const plain = (s: string) => s.replace(/\s/g, " ");

describe("Riyadh day of an instant", () => {
  it("is the next day from 21:00 UTC on, and the same day before", () => {
    expect(riyadhDayKey("2026-11-16T20:59:59Z")).toBe("2026-11-16");
    expect(riyadhDayKey("2026-11-16T21:00:00Z")).toBe("2026-11-17");
    expect(riyadhDayKey("2026-11-16T22:30:00Z")).toBe("2026-11-17");
  });

  it("dayKey (the group key of the offered windows) is the Riyadh day", () => {
    expect(dayKey("2026-11-16T22:30:00.000Z")).toBe("2026-11-17");
  });

  it("riyadhWall moves the instant by three hours, riyadhNoon is 12:00 of that day in Riyadh", () => {
    expect(riyadhWall("2026-11-17T05:00:00Z").toISOString()).toBe("2026-11-17T08:00:00.000Z");
    expect(riyadhNoon("2026-11-17").toISOString()).toBe("2026-11-17T09:00:00.000Z");
    expect(riyadhDayKey(riyadhNoon("2026-11-17"))).toBe("2026-11-17");
  });
});

describe("the days the picker asks for", () => {
  it("start from the Riyadh today, not the browser's", () => {
    // 22:30 UTC on the 16th is already the 17th in Riyadh
    expect(riyadhDays(new Date("2026-11-16T22:30:00Z"), 3)).toEqual(["2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(nextDays(new Date("2026-11-16T10:00:00Z"), 2)).toEqual(["2026-11-16", "2026-11-17"]);
  });

  it("roll over a month and a year", () => {
    expect(riyadhDays(new Date("2026-12-30T21:30:00Z"), 3)).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
  });
});

describe("the times shown", () => {
  it("08:00 in Riyadh is 05:00Z and reads 8:00 AM, not 5:00 AM", () => {
    expect(plain(slotText("en", "2026-11-17T05:00:00.000Z"))).toBe("8:00 AM");
  });

  it("a window reads in Riyadh from start to end", () => {
    expect(plain(rangeText("en", "2026-11-17T05:00:00.000Z", "2026-11-17T07:00:00.000Z"))).toBe("8:00 AM – 10:00 AM");
  });

  it("an evening slot stays on its own Riyadh day (21:30 Riyadh is 18:30Z)", () => {
    expect(plain(slotText("en", "2026-11-17T18:30:00.000Z"))).toBe("9:30 PM");
    expect(dayText("en", "2026-11-17T18:30:00.000Z")).toContain("17");
  });

  it("a slot after midnight in Riyadh is shown on the Riyadh day (00:30 Riyadh is 21:30Z of the day before)", () => {
    expect(dayText("en", "2026-11-16T21:30:00.000Z")).toContain("17");
    expect(plain(slotText("en", "2026-11-16T21:30:00.000Z"))).toBe("12:30 AM");
  });

  it("the summary of a chosen slot names the Riyadh day and time", () => {
    const text = plain(whenSummary("en", { type: "slot", id: "x", start: "2026-11-17T05:00:00.000Z", end: "2026-11-17T05:30:00.000Z" }) ?? "");
    expect(text).toContain("17");
    expect(text).toContain("8:00 AM");
  });

  it("windows are grouped by the Riyadh day", () => {
    const groups = groupByDay([
      { start: "2026-11-16T18:00:00Z", end: "2026-11-16T20:00:00Z" },
      { start: "2026-11-16T21:00:00Z", end: "2026-11-16T23:00:00Z" },
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-11-16", "2026-11-17"]);
  });
});
