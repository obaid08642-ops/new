import { describe, expect, it } from "vitest";
import { extractPatientPharmacyOffers } from "./pharmacy-offers";

describe("patient pharmacy offer adapter", () => {
  it("keeps only server offer fields needed by the patient and rejects invalid offer identities", () => {
    expect(extractPatientPharmacyOffers({ data: [{
      id: "91047ef2-ad36-422a-a184-629693e7c729",
      pharmacy_account_id: "private-provider-id",
      patient_account_id: "private-patient-id",
      pharmacy_name: "صيدلية قريبة",
      status: "open",
      totals: { total: 33.5, currency: "SAR", provider_cost: 1 },
      insurance_ready: true,
      items: [{ order_item_id: "line-1", name_ar: "دواء", requested_qty: 2, offered_qty: 1, available: true }],
    }, { id: "not-an-offer" }] })).toEqual([{
      id: "91047ef2-ad36-422a-a184-629693e7c729",
      pharmacyName: "صيدلية قريبة",
      status: "open",
      total: 33.5,
      currency: "SAR",
      insuranceReady: true,
      lines: [{ id: "line-1", name: "دواء", requestedQuantity: 2, offeredQuantity: 1, available: true }],
    }]);
  });
});
