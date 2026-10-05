import { describe, expect, it } from "vitest";
import { formatNextSlot } from "./format-slot";

// 2026-10-05 12:00 in Riyadh (UTC+3)
const now = new Date("2026-10-05T09:00:00Z");

describe("formatNextSlot", () => {
  it("says today and tomorrow in the page language, with the time in the service's zone", () => {
    expect(formatNextSlot("2026-10-05T16:30:00Z", "en", now)).toBe("today 7:30 PM");
    expect(formatNextSlot("2026-10-06T06:00:00Z", "en", now)).toBe("tomorrow 9:00 AM");
    const ar = formatNextSlot("2026-10-05T16:30:00Z", "ar", now);
    expect(ar).toContain(new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(0, "day"));
    expect(ar).not.toMatch(/today|tomorrow/);
  });

  it("uses the Riyadh calendar day, not the browser's (a late-evening UTC slot is already tomorrow there)", () => {
    expect(formatNextSlot("2026-10-05T21:30:00Z", "en", now)).toMatch(/^tomorrow /);
  });

  it("shows the weekday and date beyond tomorrow", () => {
    const text = formatNextSlot("2026-10-09T09:00:00Z", "en", now);
    expect(text).toMatch(/^Fri, Oct 9 /);
  });

  it("is null for nothing, a past time and a value that is not a time", () => {
    expect(formatNextSlot(null, "en", now)).toBeNull();
    expect(formatNextSlot("", "en", now)).toBeNull();
    expect(formatNextSlot("soon", "en", now)).toBeNull();
    expect(formatNextSlot("2026-10-01T09:00:00Z", "en", now)).toBeNull();
  });
});
