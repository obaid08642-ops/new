import { describe, expect, it } from "vitest";
import { extractPrescriptionSummaries } from "./prescriptions";

const prescriptionId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("prescription response guards", () => {
  it("keeps state, item count, and creation time only", () => {
    const prescriptions = extractPrescriptionSummaries({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private", dose: "private" }], patient_id: "private", diagnosis: "private", notes: "private", upload_image: "https://example.test/private" }] });
    expect(prescriptions).toEqual([{ id: prescriptionId, state: "CREATED_BY_DOCTOR", itemCount: 1, createdAt: "2026-08-20T10:00:00.000Z", doctorName: undefined, medicationNames: ["private"], items: [{ name: "private", dose: "private", frequencyHours: undefined, durationDays: undefined, instructions: undefined }], isPurchased: false, isOcr: false }]);
  });

  it("issue 1819: reads the purchased and photo flags only when they are exactly true", () => {
    const [a, b] = extractPrescriptionSummaries([{ id: prescriptionId, isPurchased: true, isOcr: true }, { id: "0b5a1c1e-6a53-4c5b-9a53-6d7a1d2b8f10", isPurchased: "yes" }]);
    expect([a.isPurchased, a.isOcr, b.isPurchased, b.isOcr]).toEqual([true, true, false, false]);
  });
});
