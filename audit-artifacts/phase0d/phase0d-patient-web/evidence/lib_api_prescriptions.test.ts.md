# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/prescriptions.test.ts`
- **Member SHA-256:** `992dddfd47ed2df32543cf240a51de56e4f0440febdae198c0e564a2c647ba60`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: const prescriptions = extractPrescriptionSummaries({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private", dose: "private" }], patient_id: "private", `
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: it("keeps state, item count, and creation time only", () => {`
- `8: const prescriptions = extractPrescriptionSummaries({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private", dose: "private" }], patient_id: "private", `
- `9: expect(prescriptions).toEqual([{ id: prescriptionId, state: "CREATED_BY_DOCTOR", itemCount: 1, createdAt: "2026-08-20T10:00:00.000Z", doctorName: undefined, medicationNames: ["private"], items: [{ name: "private", dose: "private", frequency`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
