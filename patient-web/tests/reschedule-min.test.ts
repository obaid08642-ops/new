import { describe, expect, it } from "vitest";
import { localDateTimeValue } from "../components-next/appointment-reschedule-form";

describe("reschedule: the earliest time of the picker", () => {
  it("is written in the reader's local time, so it matches what the picker shows", () => {
    const date = new Date(2026, 9, 18, 14, 30);
    expect(localDateTimeValue(date)).toBe("2026-10-18T14:30");
  });

  it("keeps the local clock across midnight and month ends", () => {
    expect(localDateTimeValue(new Date(2026, 9, 31, 23, 59))).toBe("2026-10-31T23:59");
    expect(localDateTimeValue(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01T00:05");
  });
});
