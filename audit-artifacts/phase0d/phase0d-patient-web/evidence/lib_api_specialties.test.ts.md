# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/specialties.test.ts`
- **Member SHA-256:** `8522605874a489096f141f1db84632f3830de57ac335cbbfc36a610f7ebcdc47`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: it("returns no fabricated specialties for malformed or empty payloads", () => {`
### payment_insurance_relevance
- `6: expect(extractSpecialties({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 4, patient_id: "secret" }, { name_ar: "" }] })).toEqual([{ slug: "cardiology", nameAr: "قلب", nameEn: "Cardiology", count: 4 }]);`
- `9: it("returns no fabricated specialties for malformed or empty payloads", () => {`
### error_empty_loading_retry_cancel
- `9: it("returns no fabricated specialties for malformed or empty payloads", () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
