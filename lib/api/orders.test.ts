import { describe, expect, it } from "vitest";
import { extractOrderRows, parseOrderId } from "./orders";

describe("order response guards", () => {
  it("rejects non-UUID route identifiers before an upstream call", () => {
    expect(parseOrderId("../../admin").success).toBe(false);
    expect(parseOrderId("91047ef2-ad36-422a-a184-629693e7c729").success).toBe(true);
  });

  it("keeps bounded patient pharmacy summary fields and excludes private payload fields", () => {
    expect(extractOrderRows({ data: [{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "DELIVERED", createdAt: "2026-08-20T10:00:00.000Z", items: [{ name_ar: "private medicine" }], totals: { total: 42, currency: "SAR" }, patient_account_id: "private-patient", delivery_address: "private-address", patient_notes: "private-notes", prescription_attachments: ["private-file"] }] })).toEqual([{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "DELIVERED", reference: undefined, createdAt: "2026-08-20T10:00:00.000Z", itemCount: 1, total: 42, currency: "SAR" }]);
  });

  it("does not invent rows when the upstream response lacks an order array", () => {
    expect(extractOrderRows({ data: { unknown: true } })).toEqual([]);
  });
});
