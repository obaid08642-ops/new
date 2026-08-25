# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_DOCTOR_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `910657ba92604440e6557967037b35246344a3f0b98ea84d8372356eecf7f52a`
- **Line count:** 50
- **Read range:** `1-50`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: The doctor dashboard contained several clinical and professional-profile states that could be rendered without a verified server record. The most serious examples included fixed appointment and referral arrays, a fallback test patient ident`
- `16: | Qualifications | Rendered SCFHS/board/degree fixtures and a timed, simulated upload that created a pending certificate. | False professional credential state. |`
- `26: | Qualifications | Removes fixed credentials and simulated upload/progress. The screen clearly states that a verified professional-document contract is required. |`
- `27: | Public media | Removes fixed stock imagery and local add/delete operations. The screen clearly states that verified storage and secure-upload contracts are required. |`
- `50: No production deployment, database mutation, patient data access, medical document issuance, referral submission, or media upload occurred in this batch.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `48: This remediation does not claim that doctor workflows are feature-complete. It deliberately prevents simulated clinical/professional data from appearing as real. Before re-enabling each contained surface, the platform requires an evidenced `
### state_transitions
- `5: **Result:** **PASS — the confirmed doctor fixtures and false-success paths are now removed or contained.**`
- `7: ## Confirmed Findings`
- `9: The doctor dashboard contained several clinical and professional-profile states that could be rendered without a verified server record. The most serious examples included fixed appointment and referral arrays, a fallback test patient ident`
- `13: | Schedule and intake | On API failure, created three named appointments with types, prices, and statuses. Missing patient and insurance values were replaced by branded patient and `Cash` values. | Fabricated clinical schedule and payment-c`
- `14: | Sick leave | Used a fallback request ID and `patient_id: 'test'`; an error path still announced successful issuance. The UI promised a unique employer-verifiable QR code without a confirmed operational contract. | A healthcare document co`
- `15: | Referrals | Preloaded named patient referrals, targets, dates, and statuses; a create success appended a local referral with `Date.now()`. | Invented referral history and service-provider status. |`
- `16: | Qualifications | Rendered SCFHS/board/degree fixtures and a timed, simulated upload that created a pending certificate. | False professional credential state. |`
- `17: | Public media | Rendered Unsplash clinic images and simulated add/delete actions locally. | False public-profile media state. |`
- `23: | Schedule and intake | API failure produces an empty schedule. Missing patient and insurance data appear as `—`, not a branded patient or cash classification. |`
- `24: | Sick leave | Requires both a linked request and linked patient before any mutation. It displays success only after the server request resolves; errors remain errors. The unverified QR claim was replaced with explicit server-contract langu`
- `25: | Referrals | Tracking starts empty with a transparent unavailable state pending a verified history contract. A server-confirmed submission is not converted to a fabricated local referral. |`
- `26: | Qualifications | Removes fixed credentials and simulated upload/progress. The screen clearly states that a verified professional-document contract is required. |`
### payment_insurance_relevance
- `13: | Schedule and intake | On API failure, created three named appointments with types, prices, and statuses. Missing patient and insurance values were replaced by branded patient and `Cash` values. | Fabricated clinical schedule and payment-c`
- `23: | Schedule and intake | API failure produces an empty schedule. Missing patient and insurance data appear as `—`, not a branded patient or cash classification. |`
- `28: | Regression | Provider contract test now rejects the identified fixtures, `test` patient ID, QR claim, false success fallback, branded/cash defaults, and stock media URLs. |`
### error_empty_loading_retry_cancel
- `14: | Sick leave | Used a fallback request ID and `patient_id: 'test'`; an error path still announced successful issuance. The UI promised a unique employer-verifiable QR code without a confirmed operational contract. | A healthcare document co`
- `16: | Qualifications | Rendered SCFHS/board/degree fixtures and a timed, simulated upload that created a pending certificate. | False professional credential state. |`
- `23: | Schedule and intake | API failure produces an empty schedule. Missing patient and insurance data appear as `—`, not a branded patient or cash classification. |`
- `24: | Sick leave | Requires both a linked request and linked patient before any mutation. It displays success only after the server request resolves; errors remain errors. The unverified QR claim was replaced with explicit server-contract langu`
- `25: | Referrals | Tracking starts empty with a transparent unavailable state pending a verified history contract. A server-confirmed submission is not converted to a fabricated local referral. |`
- `48: This remediation does not claim that doctor workflows are feature-complete. It deliberately prevents simulated clinical/professional data from appearing as real. Before re-enabling each contained surface, the platform requires an evidenced `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
