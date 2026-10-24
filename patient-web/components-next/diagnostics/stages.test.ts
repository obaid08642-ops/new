import { describe, expect, it } from "vitest";
import { CANCELLABLE_STATES, RADIOLOGY_STAGES, radiologyStageIndex } from "./stages";

describe("radiology stages", () => {
  it("places each booking state on a stage, states in between on the earlier one, cancelled on none", () => {
    expect(RADIOLOGY_STAGES).toHaveLength(5);
    expect(radiologyStageIndex("PENDING_INSURANCE")).toBe(0);
    expect(radiologyStageIndex("NEW_REQUEST")).toBe(0);
    expect(radiologyStageIndex("confirmed")).toBe(1);
    expect(radiologyStageIndex("IN_SCANNING")).toBe(2);
    expect(radiologyStageIndex("REPORT_READY")).toBe(4);
    expect(radiologyStageIndex("CANCELLED")).toBe(-1);
    expect(radiologyStageIndex(undefined)).toBe(-1);
  });
  it("lets the patient cancel only before the visit starts", () => {
    expect(CANCELLABLE_STATES.has("NEW_REQUEST")).toBe(true);
    expect(CANCELLABLE_STATES.has("IN_SCANNING")).toBe(false);
  });
});
