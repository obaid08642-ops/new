import { describe, expect, it } from "vitest";
import { extractOrderRows, parseOrderId } from "./orders";

describe("order response guards", () => {
  it("rejects non-UUID route identifiers before an upstream call", () => {
    expect(parseOrderId("../../admin").success).toBe(false);
    expect(parseOrderId("91047ef2-ad36-422a-a184-629693e7c729").success).toBe(true);
  });

  it("does not invent rows when the upstream response lacks an order array", () => {
    expect(extractOrderRows({ data: { unknown: true } })).toEqual([]);
  });
});
