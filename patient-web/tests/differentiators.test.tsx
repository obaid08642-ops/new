import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => (await import("./helpers/intl")).nextIntlMock("en"));

import { GuaranteeLine, LicenseLine } from "@/components-next/consult/differentiators";
import { AddPolicyForm } from "@/components-next/insurance/add-policy-form";
import { doctorQuery, extractDoctors, licenseOf, parseDoctorSort } from "@/lib/api/doctors";
import { bookingFlowHref, medicalOrderActionPath, parseFollowUpActions, pharmacyOrderHref } from "@/lib/consult/follow-up-actions";
import { parseLateGuarantee } from "@/lib/consult/late-guarantee";
import { copayBody } from "@/lib/insurance/copay";
import { insuredShareLine, parseQuote } from "@/lib/ordering/quote";
import { parseTransactions } from "@/lib/loyalty/view";

describe("guaranteed appointment setting", () => {
  it("reads the minutes and points from the public config", () => {
    expect(parseLateGuarantee({ late_guarantee: { minutes: 30, points: 50 } })).toEqual({ minutes: 30, points: 50 });
  });
  it("is absent (so the line is hidden) when the setting is missing or not positive whole numbers", () => {
    for (const bad of [null, {}, { late_guarantee: null }, { late_guarantee: { minutes: 30 } }, { late_guarantee: { minutes: 0, points: 5 } }, { late_guarantee: { minutes: "30", points: 5 } }, { late_guarantee: { minutes: 30.5, points: 5 } }]) {
      expect(parseLateGuarantee(bad)).toBeNull();
    }
  });
  it("draws the line filled and nothing when empty", () => {
    expect(renderToStaticMarkup(<GuaranteeLine text="Late more than 30 minutes?" />)).toContain("Late more than 30 minutes?");
    expect(renderToStaticMarkup(<GuaranteeLine text={null} />)).toBe("");
  });
});

describe("licence line", () => {
  it("shows the number and the verified flag, from license or the older field", () => {
    expect(licenseOf({ number: "12345", verified: true })).toEqual({ number: "12345", verified: true });
    expect(licenseOf({ number: "12345" })).toEqual({ number: "12345", verified: false });
    expect(licenseOf(null, "99")).toEqual({ number: "99", verified: false });
  });
  it("is hidden without a number", () => {
    expect(licenseOf({ number: null, verified: true })).toBeUndefined();
    expect(licenseOf(undefined, "  ")).toBeUndefined();
    expect(extractDoctors([{ id: "d1", name_en: "A" }])[0].license).toBeUndefined();
    expect(extractDoctors([{ id: "d1", name_en: "A", license: { number: "7", authority: "SCFHS", verified: true } }])[0].license).toEqual({ number: "7", verified: true });
  });
  it("draws the badge only when verified, and nothing without text", () => {
    expect(renderToStaticMarkup(<LicenseLine text="Licensed by SCFHS, no. 7" verifiedLabel="Verified" />)).toContain("Verified");
    const plain = renderToStaticMarkup(<LicenseLine text="Licensed by SCFHS, no. 7" />);
    expect(plain).toContain("no. 7");
    expect(plain).not.toContain("Verified");
    expect(renderToStaticMarkup(<LicenseLine text={null} verifiedLabel="Verified" />)).toBe("");
  });
});

describe("available today sort", () => {
  it("is a known sort and goes to the server as sort=available_today", () => {
    expect(parseDoctorSort("available_today")).toBe("available_today");
    expect(parseDoctorSort("bogus")).toBeUndefined();
    expect(doctorQuery({ sort: "available_today" })).toBe("/care/doctors?sort=available_today");
  });
});

describe("visit follow-up actions", () => {
  const ID1 = "123e4567-e89b-12d3-a456-426614174000";
  const lab = { kind: "lab_booking", medical_order_id: "mo-12345678", first_item_id: "it-12345678", item_ids: ["a", "b"], catalog_ids: ["x", "y"], valid_until: "2999-01-01T00:00:00.000Z" };
  it("reads the three server kinds", () => {
    expect(parseFollowUpActions([{ kind: "pharmacy_order", prescription_id: ID1 }, lab, { ...lab, kind: "radiology_booking", valid_until: null }])).toEqual([
      { kind: "pharmacy_order", prescriptionId: ID1 },
      { kind: "lab_booking", medicalOrderId: "mo-12345678", firstItemId: "it-12345678", itemCount: 2 },
      { kind: "radiology_booking", medicalOrderId: "mo-12345678", firstItemId: "it-12345678", itemCount: 2 },
    ]);
  });
  it("hides expired lab/scan actions and unknown or malformed ones", () => {
    expect(parseFollowUpActions([{ ...lab, valid_until: "2000-01-01T00:00:00.000Z" }, { kind: "bogus" }, { kind: "pharmacy_order" }, { kind: "lab_booking", medical_order_id: "x" }, "lab_booking", null])).toEqual([]);
  });
  it("is empty when the server lists none", () => {
    expect(parseFollowUpActions(undefined)).toEqual([]);
    expect(parseFollowUpActions([])).toEqual([]);
  });
  it("links to the existing flows", () => {
    expect(pharmacyOrderHref("en", ID1)).toBe(`/en/pharmacy/rx-order?prescriptionId=${ID1}`);
    expect(medicalOrderActionPath({ medicalOrderId: "mo-12345678", firstItemId: "it-12345678" })).toBe("/api/medical-orders/mo-12345678/items/it-12345678/order");
    expect(bookingFlowHref("ar", "lab_booking")).toBe("/ar/diagnostics?kind=labs");
    expect(bookingFlowHref("ar", "radiology_booking")).toBe("/ar/diagnostics?kind=radiology");
  });
});

describe("policy copay fields", () => {
  it("sends only what was filled, as the backend names them", () => {
    expect(copayBody("", "")).toEqual({ ok: true, body: {} });
    expect(copayBody("20", "")).toEqual({ ok: true, body: { copay_percent: 20 } });
    expect(copayBody("0", "150.5")).toEqual({ ok: true, body: { copay_percent: 0, copay_cap_sar: 150.5 } });
  });
  it("refuses a percent outside 0..100 and a negative or non-numeric cap", () => {
    expect(copayBody("101", "")).toEqual({ ok: false, field: "percent" });
    expect(copayBody("-1", "")).toEqual({ ok: false, field: "percent" });
    expect(copayBody("abc", "")).toEqual({ ok: false, field: "percent" });
    expect(copayBody("", "-5")).toEqual({ ok: false, field: "cap" });
    expect(copayBody("", "1000001")).toEqual({ ok: false, field: "cap" });
  });
  it("the add form has both optional fields and the hint", () => {
    const html = renderToStaticMarkup(<AddPolicyForm companies={[]} locale="en" />);
    expect(html).toContain("Your share, % (optional)");
    expect(html).toContain("Maximum per item, SAR (optional)");
    expect(html).toContain("Optional. Copy these from your card");
  });
});

describe("insured share line in booking", () => {
  const match = (extra: Record<string, unknown>) => parseQuote({
    quote_id: "q", expires_at: "2026-10-23T12:00:00.000Z", estimate: true,
    groups: [{ mode: "home", items: [{ catalog_id: "a" }], from_price: null, compare: [], split_suggestion: null, empty: null,
      best_match: { provider_id: "p1", total: 100, in_network: true, items: [{ catalog_id: "a", price: 100, coverage: "covered" }], estimated_insurance_share: 80, patient_share: 20, ...extra } }],
  })!.groups[0].bestMatch!;
  it("shows the estimate only when the server sent estimated_patient_share", () => {
    expect(insuredShareLine(match({ estimated_patient_share: 35 }), "insurance")).toEqual({ kind: "estimate", amount: 35 });
    expect(insuredShareLine(match({ estimated_patient_share: 0 }), "insurance")).toEqual({ kind: "estimate", amount: 0 });
  });
  it("says the provider confirms the share when there is no estimate and the provider accepts the insurance", () => {
    expect(insuredShareLine(match({ estimated_patient_share: null }), "insurance")).toEqual({ kind: "accepted" });
    expect(insuredShareLine(match({}), "insurance")).toEqual({ kind: "accepted" });
  });
  it("shows nothing for cash, a provider outside the network, or an invalid estimate", () => {
    expect(insuredShareLine(match({ estimated_patient_share: 35 }), "cash")).toBeNull();
    expect(insuredShareLine(match({ in_network: false }), "insurance")).toBeNull();
    expect(match({ estimated_patient_share: -3 }).estimatedPatientShare).toBeNull();
  });
});

describe("late-compensation history entry", () => {
  it("keeps its reason code so the loyalty screen can label it", () => {
    expect(parseTransactions([{ id: "t1", points_delta: 50, reason: "late_compensation", createdAt: "2026-10-24T10:00:00Z" }])[0]).toMatchObject({ delta: 50, reason: "late_compensation" });
  });
});
