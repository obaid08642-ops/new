import { describe, expect, it } from "vitest";
import { chosenSlot, nurseSlotsView, parseNurseSlots, type NurseSlotsResult } from "./nurse-slots";

// issue 1571: the live gate chose tomorrow and, in the render before tomorrow's times loaded, still saw today's times.
const today: NurseSlotsResult = { nurseId: "nurse-1", day: "2026-10-16", state: "ready", slots: [{ start: "2026-10-16T05:30:00.000Z", available: true }] };

describe("nurse slots view", () => {
  it("shows the times loaded for the chosen nurse and day", () => {
    expect(nurseSlotsView(today, "nurse-1", "2026-10-16")).toEqual({ state: "ready", slots: today.slots });
  });

  it("shows loading, not the previous day's times, as soon as another day is chosen", () => {
    expect(nurseSlotsView(today, "nurse-1", "2026-10-17")).toEqual({ state: "loading", slots: [] });
  });

  it("shows loading, not another nurse's times, as soon as another nurse is chosen", () => {
    expect(nurseSlotsView(today, "nurse-2", "2026-10-16")).toEqual({ state: "loading", slots: [] });
    expect(nurseSlotsView(null, "nurse-1", "2026-10-16")).toEqual({ state: "loading", slots: [] });
  });

  it("keeps a failed load to its own nurse and day", () => {
    const failed: NurseSlotsResult = { nurseId: "nurse-1", day: "2026-10-17", state: "failed", slots: [] };
    expect(nurseSlotsView(failed, "nurse-1", "2026-10-17").state).toBe("failed");
    expect(nurseSlotsView(failed, "nurse-1", "2026-10-18").state).toBe("loading");
  });

  it("drops the chosen time when it is not one of the times shown", () => {
    const shown = nurseSlotsView(today, "nurse-1", "2026-10-16");
    expect(chosenSlot(shown, "2026-10-16T05:30:00.000Z")).toBe("2026-10-16T05:30:00.000Z");
    expect(chosenSlot(nurseSlotsView(today, "nurse-1", "2026-10-17"), "2026-10-16T05:30:00.000Z")).toBeNull();
    expect(chosenSlot(shown, null)).toBeNull();
  });

  it("reads the free times from the slots response, leaving out booked ones", () => {
    expect(parseNurseSlots({ slots: [{ start: "a", available: true }, { start: "b", available: false }, { start: 3 }] })).toEqual([{ start: "a", available: true }]);
    expect(parseNurseSlots(null)).toEqual([]);
  });
});
