# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/doctors.test.ts`
- **Member SHA-256:** `7d4bc9a28069fd08f5be776b2355040ede36f2146e4e023ae9bd2c3bff25d1b1`
- **Line count:** 6
- **Read range:** `1-6`
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
- `5: it("builds bounded safe queries", () => { expect(doctorQuery({ specialty: "Cardiology", sort: "rating" })).toBe("/care/doctors?search=Cardiology&sort=rating"); expect(parseDoctorId("patient@example.com").success).toBe(false); });`
### payment_insurance_relevance
- `4: it("keeps only documented display data", () => expect(extractDoctors({ data: [{ id: "doc-1", name_en: "Verified Doctor", specialty: "Cardiology", rating: 4.8, consultation_fee: 150, patient_id: "private", phone: "private" }] })).toMatchObje`
- `5: it("builds bounded safe queries", () => { expect(doctorQuery({ specialty: "Cardiology", sort: "rating" })).toBe("/care/doctors?search=Cardiology&sort=rating"); expect(parseDoctorId("patient@example.com").success).toBe(false); });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
