# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/insurance-catalog-contract.test.ts`
- **Member SHA-256:** `a54e362a6f8a71ab628537f00a4edb42cc50a9d5249883852fc11bd497d4367a`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: const bookingConfirmation = read('app/consultations/booking-confirm.tsx');`
- `10: const insuranceUpload = read('app/diagnostics/insurance-upload.tsx');`
- `15: for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {`
- `19: expect(insuranceUpload).toContain('`/insurance/companies/${selCompany}/networks`');`
- `23: it('does not ship a static company or plan fallback in operational Patient screens', () => {`
- `24: for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {`
- `36: expect(insuranceUpload).toContain('setInsuranceCatalogUnavailable(true)');`
- `37: expect(bookingConfirmation).toContain('insuranceCatalogUnavailable');`
### backend_consumers_or_contracts
- `10: const insuranceUpload = read('app/diagnostics/insurance-upload.tsx');`
- `11: const profileInsurance = read('app/profile/insurance.tsx');`
- `12: const addPolicy = read('app/insurance/add-policy.tsx');`
- `16: expect(source).toMatch(/["']\/insurance\/companies["']/);`
- `18: expect(consultations).toContain('`/insurance/companies/${insCompany}/networks`');`
- `19: expect(insuranceUpload).toContain('`/insurance/companies/${selCompany}/networks`');`
- `20: expect(profileInsurance).toContain('`/insurance/companies/${c.id || c.code}/networks`');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `4: describe('Patient unified insurance catalog contract', () => {`
- `10: const insuranceUpload = read('app/diagnostics/insurance-upload.tsx');`
- `11: const profileInsurance = read('app/profile/insurance.tsx');`
- `12: const addPolicy = read('app/insurance/add-policy.tsx');`
- `15: for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {`
- `16: expect(source).toMatch(/["']\/insurance\/companies["']/);`
- `18: expect(consultations).toContain('`/insurance/companies/${insCompany}/networks`');`
- `19: expect(insuranceUpload).toContain('`/insurance/companies/${selCompany}/networks`');`
- `20: expect(profileInsurance).toContain('`/insurance/companies/${c.id || c.code}/networks`');`
- `24: for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {`
- `25: expect(source).not.toContain('INSURANCE_COMPANIES_FULL');`
- `26: expect(source).not.toContain('COVERAGE_CLASSES');`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
