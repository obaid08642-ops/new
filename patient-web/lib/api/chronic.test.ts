import { describe, expect, it } from "vitest";
import { parseChronicDiseases } from "./chronic";
describe("chronic condition response guards", () => {
  it("keeps patient-recorded name/source and drops clinical/private fields", () => {
    expect(parseChronicDiseases([{ id: "cc-0", name: "Asthma", controlled: true, patient_id: "private", severity: "private", source: "patient_profile" }])).toEqual([{ id: "cc-0", name: "Asthma", source: "patient_profile" }]);
  });
});
