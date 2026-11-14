import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { barState, selectionLabel, summaryItems } from "@/lib/consult/doctor-summary";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const waitText = (time: string) => `Wait ~${time}`;

describe("doctor summary line", () => {
  it("has specialty, stars with count, fee and wait when all are sent", () => {
    expect(summaryItems({ locale: "en", specialty: "Cardiology", rating: 4.8, reviews: 120, feeText: "150 SAR", waitMinutes: 15, waitText })).toEqual(["Cardiology", "★ 4.8 (120)", "150 SAR", "Wait ~15 min"]);
  });
  it("leaves out what the server did not send, never inventing a value", () => {
    expect(summaryItems({ locale: "en", specialty: "Cardiology", waitText })).toEqual(["Cardiology"]);
    expect(summaryItems({ locale: "en", rating: 4, waitText })).toEqual(["★ 4"]);
    expect(summaryItems({ locale: "en", reviews: 5, waitMinutes: 0, waitText })).toEqual([]);
  });
  it("formats numbers in the active locale", () => {
    const [, rating] = summaryItems({ locale: "ar-EG", specialty: "x", rating: 4.5, reviews: 12, waitText });
    expect(rating).toContain(new Intl.NumberFormat("ar-EG").format(12));
  });
});

describe("sticky bar label", () => {
  const start = new Date(2026, 9, 30, 17, 30).toISOString();
  it("shows day, time and fee in the active locale", () => {
    const label = selectionLabel("en", start, "150 SAR");
    expect(label).toContain("Fri");
    expect(label).toContain("30");
    expect(label).toContain("Oct");
    expect(label).toMatch(/5:30\s?PM/i);
    expect(label?.endsWith("150 SAR")).toBe(true);
  });
  it("drops the fee when none was sent and rejects an unreadable start", () => {
    expect(selectionLabel("en", start)?.endsWith("PM")).toBe(true);
    expect(selectionLabel("en", "bad")).toBeNull();
  });
  it("is disabled until a time is chosen, then carries the fee of the chosen visit type", () => {
    expect(barState("en", null, { clinic: "150 SAR" })).toEqual({ enabled: false });
    const state = barState("en", { type: "video", start }, { clinic: "150 SAR", video: "100 SAR" });
    expect(state.enabled).toBe(true);
    if (state.enabled) { expect(state.type).toBe("video"); expect(state.label.endsWith("100 SAR")).toBe(true); }
  });
});

describe("doctor profile structure", () => {
  const page = read("app/[locale]/consultations/doctors/[doctorId]/page.tsx");
  it("puts the summary under the photo and the bar in the shell footer", () => {
    expect(page).toContain("summary={summary}");
    expect(page).toContain("footer={<StickyBookBar");
    expect(page.indexOf("<ProfileHeader")).toBeLessThan(page.indexOf('id="slots-title"'));
  });
  it("makes time chips radios that set the selection (no link per chip)", () => {
    const src = read("components-next/consult/doctor-schedule.tsx");
    expect(src).toContain('role="radio"');
    expect(src).toContain("setSelection({ type, start: s.start })");
    expect(src).not.toContain("slotTimeLabel(locale, s.start)}</Link>");
  });
  it("draws the summary after the photo and has no inline styles or raw colours", () => {
    const header = read("components-next/consult/profile-header.tsx");
    expect(header.indexOf("own.photo")).toBeLessThan(header.indexOf("own.summaryList"));
    const css = read("components-next/consult/doctor-schedule.module.css");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(/);
    expect(read("components-next/consult/doctor-booking-bar.tsx")).not.toContain("style=");
  });
  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s has the new keys", (l) => {
    const m = JSON.parse(read(`messages/${l}.json`)).Doctors as Record<string, string>;
    for (const k of ["summaryWait", "summaryLabel", "stickyBarLabel", "stickyBook", "stickyChooseTime"]) expect(m[k]).toBeTruthy();
    expect(m.summaryWait).toContain("{time}");
  });
});
