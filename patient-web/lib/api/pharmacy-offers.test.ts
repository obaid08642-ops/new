import { describe, expect, it } from "vitest";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress } from "./pharmacy-offers";

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

describe("patient pharmacy order-progress adapter", () => {
  it("exposes only the state and accepted quote details required for patient actions", () => {
    expect(extractPatientPharmacyOrderProgress({
      governed_state: "FINAL_QUOTE_ACCEPTED", coverage_mode: "cash", accepted_quote_hash: "hash", accepted_quote_revision: 3,
      accepted_quote_snapshot: { cod_allowed: true, provider_internal_cost: 12 }, payment_status: "pending",
    })).toEqual({ governedState: "FINAL_QUOTE_ACCEPTED", coverageMode: "cash", acceptedQuoteHash: "hash", acceptedQuoteRevision: 3, codAllowed: true, paymentStatus: "pending" });
  });
});
