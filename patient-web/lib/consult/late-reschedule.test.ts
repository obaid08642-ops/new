import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLateReschedule } from "./late-reschedule";

describe("the late free reschedule offer", () => {
  it("is offered only when it is late and still available", () => {
    expect(readLateReschedule({ free_reschedule: { available: true, late: true, within_days: 14 } })).toEqual({ days: 14 });
    expect(readLateReschedule({ data: { free_reschedule: { available: true, late: true, within_days: 14 } } })).toEqual({ days: 14 });
    expect(readLateReschedule({ free_reschedule: { available: true, late: false, within_days: 14 } })).toBeNull();
    expect(readLateReschedule({ free_reschedule: { available: false, late: true, within_days: 14 } })).toBeNull();
  });
  it("ignores a broken answer", () => {
    expect(readLateReschedule(null)).toBeNull();
    expect(readLateReschedule({})).toBeNull();
    expect(readLateReschedule({ free_reschedule: { available: true, late: true, within_days: "x" } })).toBeNull();
  });
});

describe("the preview path matches the backend route (path contract)", () => {
  const read = (p: string) => readFileSync(join(__dirname, p), "utf8");
  it("backend serves GET :id/refund/preview and the web page calls exactly that", () => {
    expect(read("../../../backend/src/modules/care/appointments.controller.ts")).toMatch(/@Get\(':id\/refund\/preview'\)/);
    const page = read("../../app/[locale]/consultations/cancel-reschedule/page.tsx");
    expect(page).toContain("/refund/preview");
    expect(page).not.toContain("refund-preview");
  });
});
