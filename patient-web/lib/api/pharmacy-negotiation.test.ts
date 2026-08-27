import { describe, expect, it } from "vitest";
import { buildNegotiationMessage, extractPatientPharmacyMessages, extractPatientPharmacyThreads } from "./pharmacy-negotiation";

describe("patient pharmacy negotiation adapter", () => {
  it("accepts scoped threads and patient-visible messages only", () => {
    expect(extractPatientPharmacyThreads([{ id: "91047ef2-ad36-422a-a184-629693e7c729", order_id: "order", status: "open" }])).toEqual([{ id: "91047ef2-ad36-422a-a184-629693e7c729", orderId: "order", status: "open", orderItemId: undefined, resolution: undefined }]);
    expect(extractPatientPharmacyMessages({ messages: [{ id: "81047ef2-ad36-422a-a184-629693e7c729", text: "Alternative", sender_role: "pharmacy", substitute_offer: { name: "Alt", price: 12, internal_cost: 2 } }] })).toEqual([{ id: "81047ef2-ad36-422a-a184-629693e7c729", text: "Alternative", senderRole: "pharmacy", createdAt: undefined, substitute: { sku: undefined, name: "Alt", price: 12, notes: undefined } }]);
  });
  it("bounds patient negotiation messages", () => { expect(buildNegotiationMessage("  Please use the alternative  ")).toEqual({ text: "Please use the alternative" }); expect(buildNegotiationMessage(" ")).toBeNull(); });
});
