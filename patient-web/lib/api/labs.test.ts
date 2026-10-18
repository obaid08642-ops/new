import { describe, expect, it } from "vitest";
import { extractLabService, extractLabServices, labPaymentFits, parseLabServiceId } from "./labs";

describe("labs parser", () => {
  it("keeps only public catalog fields and strips internal data", () => {
    const item = extractLabService({ id: "cbc", name_en: "CBC", price: 20, patient_id: "secret", provider_account_id: "internal", __v: 4 });
    expect(item).toEqual(expect.objectContaining({ id: "cbc", nameEn: "CBC", price: 20 }));
    expect(item).not.toHaveProperty("patient_id");
    expect(item).not.toHaveProperty("provider_account_id");
  });
  it("extracts wrapped lists and rejects unsafe ids", () => {
    expect(extractLabServices({ data: [{ id: "a", name_ar: "تحليل" }, { id: "bad id", name_en: "ignored" }] })).toHaveLength(1);
    expect(parseLabServiceId("bad/id").success).toBe(false);
  });
});

describe("decision 30: the diagnostics hub's insurance or self-pay filter (3-web 3, issue 635)", () => {
  const [both, selfOnly, insOnly, unmarked] = extractLabServices([
    { id: "both", name_en: "Both", cash_availability: true, insurance_availability: true },
    { id: "self", name_en: "Self", cash_availability: true, insurance_availability: false },
    { id: "ins", name_en: "Ins", cash_availability: false, insurance_availability: true },
    { id: "none", name_en: "Unmarked" },
  ]);
  it("reads the service's cash_availability and insurance_availability", () => {
    expect(selfOnly.cashAvailable).toBe(true);
    expect(insOnly.cashAvailable).toBe(false);
    expect(insOnly.insuranceAvailable).toBe(true);
  });
  it("insurance lists only what takes insurance; self-pay lists what the patient may pay (unmarked = yes)", () => {
    expect([both, selfOnly, insOnly, unmarked].filter((s) => labPaymentFits("insurance", s)).map((s) => s.id)).toEqual(["both", "ins"]);
    expect([both, selfOnly, insOnly, unmarked].filter((s) => labPaymentFits("self_pay", s)).map((s) => s.id)).toEqual(["both", "self", "none"]);
  });
});
