import { describe, expect, it } from "vitest";
import { canHideStatus, readHiddenVisits, visitKey } from "./hidden-visits";

describe("PT-54 hidden visits", () => {
  it("reads the hidden visits of the timeline answer, in both shapes, skipping rows without a kind or an id", () => {
    const rows = [{ kind: "consultation", id: "a1", hidden: true }, { kind: "consultation", id: "a2", hidden: false }, { kind: "lab", id: "l1", hidden: true }, { id: "x", hidden: true }, { kind: "lab", hidden: true }];
    expect([...readHiddenVisits(rows)].sort()).toEqual(["consultation:a1", "lab:l1"]);
    expect(readHiddenVisits({ data: rows }).size).toBe(2);
    expect(readHiddenVisits(null).size).toBe(0);
    expect(readHiddenVisits("x").size).toBe(0);
  });
  it("the key is kind:id", () => {
    expect(visitKey("consultation", "a1")).toBe("consultation:a1");
  });
  it("only a finished visit can be hidden", () => {
    for (const s of ["completed", "CANCELLED", "Completed"]) expect(canHideStatus(s)).toBe(true);
    for (const s of ["confirmed", "pending", "in_progress", "no_show", "", undefined]) expect(canHideStatus(s)).toBe(false);
  });
});
