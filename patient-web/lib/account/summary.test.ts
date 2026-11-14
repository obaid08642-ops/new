import { describe, expect, it } from "vitest";
import { listCount, pointsOf } from "./summary";

describe("account summary values", () => {
  it("reads points only when sent", () => {
    expect(pointsOf({ points: 120 })).toBe(120);
    expect(pointsOf({ data: { balance: 0 } })).toBe(0);
    expect(pointsOf({})).toBeNull();
    expect(pointsOf({ points: "12" })).toBeNull();
    expect(pointsOf(null)).toBeNull();
  });
  it("counts list answers", () => {
    expect(listCount([1, 2])).toBe(2);
    expect(listCount({ data: [1] })).toBe(1);
    expect(listCount({ items: [] })).toBe(0);
    expect(listCount({ message: "x" })).toBeNull();
    expect(listCount(null)).toBeNull();
  });
});
