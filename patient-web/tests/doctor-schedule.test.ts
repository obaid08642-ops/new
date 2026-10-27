import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildScheduleDays, groupSlotsByDay, localIsoDate } from "@/lib/consult/doctor-schedule";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("doctor schedule days", () => {
  const from = new Date(2026, 9, 27, 15, 30); // Tue 27 Oct 2026, local

  it("builds consecutive local days, today and tomorrow flagged", () => {
    const days = buildScheduleDays(5, "en", from);
    expect(days.map((d) => d.iso)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    expect(days[0].relative).toBe("today");
    expect(days[1].relative).toBe("tomorrow");
    expect(days[2].relative).toBeUndefined();
    expect(days[2]).toMatchObject({ weekday: "Thu", dayNumber: "29", month: "Oct" });
  });

  it("formats weekday, month and number with the active locale", () => {
    const [today] = buildScheduleDays(1, "ar-EG", from);
    expect(today.weekday).not.toBe("Tue");
    expect(today.dayNumber).toBe(new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(27));
  });

  it("rolls over a month end", () => {
    expect(buildScheduleDays(3, "en", new Date(2026, 11, 30)).map((d) => d.iso)).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
  });
});

describe("groupSlotsByDay", () => {
  it("groups by local calendar day, sorted, dropping unreadable starts", () => {
    const a = new Date(2026, 9, 28, 9, 0).toISOString();
    const b = new Date(2026, 9, 28, 17, 30).toISOString();
    const c = new Date(2026, 9, 29, 8, 0).toISOString();
    const groups = groupSlotsByDay([{ start: b }, { start: "bad" }, { start: c }, { start: a }]);
    expect([...groups.keys()]).toEqual(["2026-10-28", "2026-10-29"]);
    expect(groups.get("2026-10-28")?.map((s) => s.start)).toEqual([a, b]);
    expect(localIsoDate(new Date(a))).toBe("2026-10-28");
  });

  it("returns no groups for no slots", () => {
    expect(groupSlotsByDay([]).size).toBe(0);
  });
});

describe("doctor profile order (web)", () => {
  const page = read("app/[locale]/consultations/doctors/[doctorId]/page.tsx");
  const at = (needle: string) => { const i = page.indexOf(needle); expect(i, needle).toBeGreaterThan(-1); return i; };

  it("is photo and main info, appointments, gallery, about and more info, education, reviews", () => {
    const order = [at("<ProfileHeader"), at('id="slots-title"'), at('id="clinic-photos-title"'), at('id="bio-title"'), at('id="info-title"'), at('id="education-title"'), at('id="reviews-title"')];
    expect(order).toEqual([...order].sort((x, y) => x - y));
    expect(page).toContain("largePhoto");
  });

  it("hides the gallery when the server sent no clinic photos", () => {
    expect(page).toMatch(/doctor\.clinicPhotos\?\.length \? \(\s*<SectionCard id="clinic-photos-title"/);
  });

  it("keeps the booking link and stays a server page", () => {
    expect(page).toContain("/consultations/book/");
    expect(page.startsWith('import')).toBe(true);
    expect(page).not.toContain('"use client"');
  });

  it("the public page shows the appointments before the insurance card", () => {
    const slug = read("app/[locale]/doctor/[slug]/page.tsx");
    expect(slug.indexOf("<DoctorSchedule")).toBeGreaterThan(slug.indexOf("<ProfileHeader"));
    expect(slug.indexOf("<DoctorSchedule")).toBeLessThan(slug.indexOf('id="doctor-insurance"'));
    expect(slug).not.toContain('"use client"');
  });
});

describe("schedule styles and six-language keys", () => {
  const css = read("components-next/consult/doctor-schedule.module.css");
  it("uses tokens and logical properties only", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|\bleft\b|\bright\b|margin-left|margin-right/);
  });
  const keys = ["scheduleDaysLabel", "scheduleTimesLabel", "scheduleToday", "scheduleTomorrow", "scheduleLoading", "scheduleEmpty", "scheduleNoDays", "scheduleError", "scheduleRetry", "scheduleSignIn"];
  const en = JSON.parse(read("messages/en.json")).Doctors as Record<string, string>;
  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s has every key, non-empty", (lang) => {
    const ns = JSON.parse(read(`messages/${lang}.json`)).Doctors as Record<string, string>;
    for (const key of keys) {
      expect(ns[key], `${lang}.${key}`).toBeTruthy();
      if (lang !== "en") expect(ns[key], `${lang}.${key} not English`).not.toBe(en[key]);
    }
  });
});
