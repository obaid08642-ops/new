import { describe, expect, it } from "vitest";
import { parseRecordRows, parseReminderCard } from "./dashboard-extras";

const id = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";

describe("parseReminderCard", () => {
  it("is null without reminders", () => {
    expect(parseReminderCard([])).toBeNull();
    expect(parseReminderCard(null)).toBeNull();
  });
  it("names the earliest pending dose", () => {
    const payload = [
      { id, medicine_name_en: "Late", dose: "1 tab", times: ["20:00"], today_doses: [{ time_key: "20:00", status: "pending" }] },
      { id: id2, medicine_name_en: "Early", times: ["08:00"], today_doses: [{ time_key: "08:00", status: "pending" }] },
    ];
    expect(parseReminderCard(payload)).toEqual({ kind: "next", name: "Early", detail: "08:00" });
  });
  it("says done when nothing is pending", () => {
    const payload = [{ id, medicine_name_en: "A", times: ["08:00"], today_doses: [{ time_key: "08:00", status: "taken" }] }];
    expect(parseReminderCard(payload)).toEqual({ kind: "done", taken: 1, total: 1 });
  });
});

describe("parseRecordRows", () => {
  const now = new Date("2026-10-20T09:00:00Z");
  it("leaves out reads that failed or are empty", () => {
    expect(parseRecordRows({ nutrition: null, vitals: null, mood: null, maternity: null }, now)).toEqual([]);
    expect(parseRecordRows({ nutrition: { meals_count: 0, water: { consumed_ml: 0 } }, vitals: [], mood: null, maternity: { profile_ready: false } }, now)).toEqual([]);
  });
  it("builds the rows from the answers", () => {
    const rows = parseRecordRows(
      {
        nutrition: { meals_count: 2, water: { consumed_ml: 500 } },
        vitals: [{ key: "heart_rate", value: "70", unit: "bpm" }],
        mood: [{ id: "m", mood: "good", logged_at: "2026-10-20T07:00:00Z" }],
        maternity: { profile_ready: true, is_pregnant: true },
      },
      now,
    );
    expect(rows.map((row) => row.key)).toEqual(["nutrition", "vitals", "mood", "maternity"]);
    expect(rows.find((row) => row.key === "nutrition")).toEqual({ key: "nutrition", meals: 2, waterMl: 500 });
    expect(rows.find((row) => row.key === "mood")).toEqual({ key: "mood", loggedToday: true });
    expect(rows.find((row) => row.key === "maternity")).toEqual({ key: "maternity", pregnant: true });
  });
  it("mood not logged today", () => {
    const rows = parseRecordRows({ nutrition: null, vitals: null, mood: [], maternity: null }, now);
    expect(rows).toEqual([{ key: "mood", loggedToday: false }]);
  });
});
