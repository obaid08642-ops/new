import { describe, expect, it } from "vitest";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress, quoteToAccept } from "./pharmacy-offers";

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
      accepted_quote_snapshot: { cod_allowed: true, totals: { total: 36.5 }, provider_internal_cost: 12 }, payment_status: "pending",
    })).toEqual({ governedState: "FINAL_QUOTE_ACCEPTED", coverageMode: "cash", acceptedQuoteHash: "hash", acceptedQuoteRevision: 3, acceptedQuoteTotal: 36.5, codAllowed: true, paymentStatus: "pending" });
  });

  it("keeps insurance decisions scoped to the patient-facing per-item result", () => {
    expect(extractPatientPharmacyOrderProgress({
      governed_state: "INSURANCE_DECISION_READY",
      insurance_decision_summary: { decision: "APPROVED_PARTIAL", co_pay_amount: 5, covered_amount: 20, provider_note: "internal" },
      insurance_item_decisions: [{ order_item_id: "line-1", decision: "APPROVED_FULL", line_amount: 20, covered_amount: 20, co_pay_amount: 0, reason: "policy" }],
    })?.insurance).toEqual({
      decision: "APPROVED_PARTIAL", coPayAmount: 5, coveredAmount: 20,
      items: [{ id: "line-1", decision: "APPROVED_FULL", lineAmount: 20, coveredAmount: 20, coPayAmount: 0, reason: "policy" }],
    });
  });
});

describe("patient pharmacy offers as the backend really sends them", () => {
  const payload = [{
    id: "91047ef2-ad36-422a-a184-629693e7c729",
    status: "open",
    items: [{ order_item_id: "l1", action: "available", qty_requested: 2, qty_offered: 2, unit_price: 18, currency: "SAR" }],
    lines: [{ order_item_id: "l1", sku: "S1", name: "Panadol", available: true, requested_qty: 2, offered_qty: 2, unit_price: 18, alternative: null }],
    totals: { subtotal: 36, delivery_fee: 5, total: 41, currency: "SAR" },
    quote_expires_at: "2026-10-06T10:00:00.000Z",
    expires_at: "2026-10-06T10:00:00.000Z",
    pharmacy_name: "Test pharmacy",
    preparation_minutes: 20,
    provider_note: "Ready soon",
    approx_distance_km: 1.5,
    approx_delivery: { eta_minutes: 60, label_en: "Approximately within 1 hour" },
  }];

  it("reads the named `lines` (the bare `items` rows have no product name) with their prices, and the totals as sent", () => {
    const [offer] = extractPatientPharmacyOffers(payload);
    expect(offer.lines).toEqual([{ id: "l1", name: "Panadol", requestedQuantity: 2, offeredQuantity: 2, unitPrice: 18, available: true, alternative: undefined }]);
    expect(offer).toMatchObject({ subtotal: 36, deliveryFee: 5, total: 41, currency: "SAR", preparationMinutes: 20, expiresAt: "2026-10-06T10:00:00.000Z", providerNote: "Ready soon", approxDistanceKm: 1.5 });
  });

  it("does not carry the server's constant delivery estimate, and invents no total when the server sent none", () => {
    const [offer] = extractPatientPharmacyOffers(payload);
    expect(offer).not.toHaveProperty("etaLabel");
    expect(extractPatientPharmacyOffers([{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "open" }])[0].total).toBeUndefined();
  });
});

describe("the quote a patient is asked to accept", () => {
  const hash = "b".repeat(64);
  it("takes the hash and revision from the order's top-level handles, as the app does", () => {
    const progress = extractPatientPharmacyOrderProgress({
      status: "cash_card_payment_pending", governed_state: "OFFER_SELECTED",
      selected_offer_snapshot: { offer_id: "o", offer_version: 3, totals: { subtotal: 36, delivery_fee: 5, total: 41, currency: "SAR" }, hash },
      selected_offer_hash: hash, selected_offer_revision: 3,
    });
    expect(progress?.status).toBe("cash_card_payment_pending");
    expect(quoteToAccept(progress)).toEqual({ hash, revision: 3, subtotal: 36, deliveryFee: 5, total: 41, currency: "SAR" });
  });

  it("a revised final quote wins only while the order is FINAL_QUOTE_READY", () => {
    const order = {
      selected_offer_snapshot: { totals: { total: 41 }, hash }, selected_offer_hash: hash, selected_offer_revision: 3,
      pending_final_quote_snapshot: { totals: { total: 39 }, hash: "c".repeat(64), offer_version: 4 }, pending_final_quote_hash: "c".repeat(64), pending_final_quote_revision: 4,
    };
    expect(quoteToAccept(extractPatientPharmacyOrderProgress({ ...order, governed_state: "FINAL_QUOTE_READY" }))).toMatchObject({ total: 39, revision: 4 });
    expect(quoteToAccept(extractPatientPharmacyOrderProgress({ ...order, governed_state: "OFFER_SELECTED" }))).toMatchObject({ total: 41, revision: 3 });
    expect(quoteToAccept(null)).toBeUndefined();
  });

  it("reads the insurer's share and the order's item names for the decision", () => {
    const progress = extractPatientPharmacyOrderProgress({
      governed_state: "INSURANCE_DECISION_READY",
      insurance_decision_summary: { decision: "APPROVED_PARTIAL", co_pay_amount: 5, insurer_share: 20, currency: "SAR" },
      items: [{ id: "l1", raw_name: "paracetamol", name_ar: "بانادول", name_en: "Panadol" }],
    });
    expect(progress?.insurance).toMatchObject({ decision: "APPROVED_PARTIAL", coPayAmount: 5, coveredAmount: 20 });
    expect(progress?.items).toEqual([{ id: "l1", nameAr: "بانادول", nameEn: "Panadol", rawName: "paracetamol" }]);
  });
});
