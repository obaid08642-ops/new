import { describe, expect, it } from "vitest";
import { extractPatientPharmacyOffers, extractPatientPharmacyOrderProgress } from "@/lib/api/pharmacy-offers";
import { parseOrderDetail, pharmacyDisplayName } from "./order-view";

// #366 / #375 / #514: the names the order detail and the offers carry. TEST payloads in the shape of pharmacy-order.service.ts.
describe("the filling pharmacy name", () => {
  const base = { id: "o1", status: "confirmed" };

  it("picks the chosen allocation's names, else the order's, and leaves it out when absent", () => {
    const own = parseOrderDetail({ ...base, pharmacy_name_ar: "صيدلية النور", pharmacy_name_en: "Al Noor" }, "en");
    expect(own?.pharmacyName).toEqual({ ar: "صيدلية النور", en: "Al Noor" });
    const chosen = parseOrderDetail({ ...base, selected_allocation_id: "a2", allocations_detail: [{ id: "a1", pharmacy_name_en: "First" }, { id: "a2", pharmacy_name_ar: "ثانية", pharmacy_name_en: "Second" }] }, "en");
    expect(chosen?.pharmacyName).toEqual({ ar: "ثانية", en: "Second" });
    expect(parseOrderDetail(base, "en")?.pharmacyName).toBeUndefined();
  });

  it("is Arabic for ar and English for every other language", () => {
    const names = { ar: "صيدلية النور", en: "Al Noor" };
    expect(pharmacyDisplayName(names, "ar")).toBe("صيدلية النور");
    for (const locale of ["en", "ur", "hi", "bn", "fil"]) expect(pharmacyDisplayName(names, locale)).toBe("Al Noor");
    expect(pharmacyDisplayName({ ar: "صيدلية النور" }, "ur")).toBe("صيدلية النور");
    expect(pharmacyDisplayName(undefined, "en")).toBeUndefined();
  });

  it("is read from an offer and from the order progress used by the final-quote screen", () => {
    const [offer] = extractPatientPharmacyOffers({ data: [{ id: "91047ef2-ad36-422a-a184-629693e7c729", status: "open", pharmacy_name_ar: "صيدلية", pharmacy_name_en: "Pharmacy", totals: { total: 1 } }] });
    expect(offer.pharmacyNames).toEqual({ ar: "صيدلية", en: "Pharmacy" });
    const progress = extractPatientPharmacyOrderProgress({ selected_allocation_id: "a1", allocations_detail: [{ id: "a1", pharmacy_name_ar: "ا", pharmacy_name_en: "A" }], pharmacy_name_ar: null, pharmacy_name_en: null });
    expect(progress?.pharmacyNames).toEqual({ ar: "ا", en: "A" });
    expect(extractPatientPharmacyOrderProgress({ status: "draft" })?.pharmacyNames).toBeUndefined();
  });
});
