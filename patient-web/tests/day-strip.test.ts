import { describe, expect, it } from "vitest";
import { dayStrip } from "@/lib/consult/day-strip";

describe("day strip", () => {
  it("lists local calendar dates from today, across a month end", () => {
    const days = dayStrip(3, new Date(2026, 9, 30, 23, 59));
    expect(days.map((d) => d.iso)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("keeps the local date late in the evening (not the UTC date)", () => {
    expect(dayStrip(1, new Date(2026, 0, 1, 0, 5))[0].iso).toBe("2026-01-01");
  });
});

import { isOpen, isUpcoming, statusKey } from "@/lib/consult/appointment-view";
import { cancelledMessage } from "@/components-next/appointment-actions";

describe("pending co-pay visit", () => {
  it("is a known, upcoming, open status", () => {
    expect(statusKey("PENDING_COPAY")).toBe("pending_copay");
    expect(isUpcoming("pending_copay")).toBe(true);
    expect(isOpen("pending_copay")).toBe(true);
  });
});

describe("cancel refund amount", () => {
  it("writes the riyal as the Urdu symbol in Urdu, not the code", () => {
    const text = { refunded: "{amount}", noRefund: "n", notCharged: "c" };
    expect(cancelledMessage({ paid: true, percent: 50, amount: 100 }, text, "ur")).toContain("ر.س");
  });
});
