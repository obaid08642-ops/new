import { describe, expect, it } from "vitest";
import { extractPrescriptionSummaries } from "./prescriptions";

const prescriptionId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("prescription response guards", () => {
  it("keeps state, item count, and creation time only", () => {
    const prescriptions = extractPrescriptionSummaries({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private", dose: "private" }], patient_id: "private", diagnosis: "private", notes: "private", upload_image: "https://example.test/private" }] });
    expect(prescriptions).toEqual([{ id: prescriptionId, state: "CREATED_BY_DOCTOR", itemCount: 1, createdAt: "2026-08-20T10:00:00.000Z", doctorName: undefined, medicationNames: ["private"] }]);
  });
});
