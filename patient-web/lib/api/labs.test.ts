import { describe, expect, it } from "vitest";
import { extractLabService, extractLabServices, parseLabServiceId } from "./labs";

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
