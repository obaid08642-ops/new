# Nabdah Provider — Doctor Dashboard Truthfulness Remediation

**Date:** 2026-08-19  
**Scope:** Provider application source, isolated archive only.  
**Result:** **PASS — the confirmed doctor fixtures and false-success paths are now removed or contained.**

## Confirmed Findings

The doctor dashboard contained several clinical and professional-profile states that could be rendered without a verified server record. The most serious examples included fixed appointment and referral arrays, a fallback test patient identifier for sick leave, and simulated qualification/media upload flows.

| Surface | Previous behavior | Integrity concern |
|---|---|---|
| Schedule and intake | On API failure, created three named appointments with types, prices, and statuses. Missing patient and insurance values were replaced by branded patient and `Cash` values. | Fabricated clinical schedule and payment-context data. |
| Sick leave | Used a fallback request ID and `patient_id: 'test'`; an error path still announced successful issuance. The UI promised a unique employer-verifiable QR code without a confirmed operational contract. | A healthcare document could appear issued without a linked patient/request or server result. |
| Referrals | Preloaded named patient referrals, targets, dates, and statuses; a create success appended a local referral with `Date.now()`. | Invented referral history and service-provider status. |
| Qualifications | Rendered SCFHS/board/degree fixtures and a timed, simulated upload that created a pending certificate. | False professional credential state. |
| Public media | Rendered Unsplash clinic images and simulated add/delete actions locally. | False public-profile media state. |

## Applied Remediation

| Surface | Source behavior now |
|---|---|
| Schedule and intake | API failure produces an empty schedule. Missing patient and insurance data appear as `—`, not a branded patient or cash classification. |
| Sick leave | Requires both a linked request and linked patient before any mutation. It displays success only after the server request resolves; errors remain errors. The unverified QR claim was replaced with explicit server-contract language. |
| Referrals | Tracking starts empty with a transparent unavailable state pending a verified history contract. A server-confirmed submission is not converted to a fabricated local referral. |
| Qualifications | Removes fixed credentials and simulated upload/progress. The screen clearly states that a verified professional-document contract is required. |
| Public media | Removes fixed stock imagery and local add/delete operations. The screen clearly states that verified storage and secure-upload contracts are required. |
| Regression | Provider contract test now rejects the identified fixtures, `test` patient ID, QR claim, false success fallback, branded/cash defaults, and stock media URLs. |

## Verification Gates

| Gate | Command | Result |
|---|---|---|
| Static type checking | `npx tsc --noEmit` | **PASS** |
| Provider contract regression | `npm test -- --runInBand` | **PASS — 1 suite / 24 tests** |
| Production-mode Expo web export | `CI=1 EXPO_NO_TELEMETRY=1 NODE_ENV=production npx expo export --platform web --no-bytecode --max-workers 1 --clear` | **PASS — 899 modules bundled** |
| Archive integrity | `unzip -t` plus excluded-directory inspection | **PASS** |

## Archive Candidate

```text
NabdProvider-provider.zip
SHA-256: a6642f291fc12ec95288a959e77fe5d558b4b4d77d47e64817200bb5307f9ca8
```

## Explicit Boundaries

This remediation does not claim that doctor workflows are feature-complete. It deliberately prevents simulated clinical/professional data from appearing as real. Before re-enabling each contained surface, the platform requires an evidenced backend contract with patient/provider ownership, persistence, auditability, secure storage where applicable, error behavior, source tests, and sandbox E2E proof. The human six-language, RTL/LTR, accessibility, signed-device, and deployment-authorization requirements remain open.

No production deployment, database mutation, patient data access, medical document issuance, referral submission, or media upload occurred in this batch.
