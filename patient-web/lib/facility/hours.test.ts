import { describe, expect, it } from "vitest";
import { dayKey, directionsHref, facilityHoursRows, facilityPoint } from "./hours";

describe("facility opening hours", () => {
  it("names the days in the locale and keeps the week order (Saturday first)", () => {
    const rows = facilityHoursRows("en", [{ day: "fri", open: "14:00", close: "22:00" }, { day: "sat", open: "08:00", close: "22:00" }], "Closed");
    expect(rows).toEqual([{ label: "Saturday", value: "08:00–22:00" }, { label: "Friday", value: "14:00–22:00" }]);
    expect(facilityHoursRows("ar", [{ day: "sun", open: "08:00", close: "16:00" }], "مغلق")[0].label).toBe(new Intl.DateTimeFormat("ar", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7))));
  });
  it("accepts long day names, shows an evening shift and says closed", () => {
    const rows = facilityHoursRows("en", [{ day: "Monday", open: "08:00", close: "12:00", open_evening: "16:00", close_evening: "20:00" }, { day: "tuesday", closed: true }], "Closed");
    expect(rows).toEqual([{ label: "Monday", value: "08:00–12:00 · 16:00–20:00" }, { label: "Tuesday", value: "Closed" }]);
  });
  it("leaves out a day with no hours and a day it cannot name (nothing is invented)", () => {
    expect(facilityHoursRows("en", [{ day: "wed" }, { day: "someday", open: "08:00", close: "09:00" }], "Closed")).toEqual([]);
    expect(dayKey("xyz")).toBeNull();
  });
  it("takes a pin only when both numbers are real, and links directions to it", () => {
    expect(facilityPoint(24.7, 46.6)).toEqual({ lat: 24.7, lng: 46.6 });
    expect(facilityPoint(null, 46.6)).toBeNull();
    expect(facilityPoint(95, 46.6)).toBeNull();
    expect(facilityPoint("24.7", 46.6)).toBeNull();
    expect(directionsHref({ lat: 24.7, lng: 46.6 })).toBe("https://www.google.com/maps/dir/?api=1&destination=24.7,46.6");
  });
});
