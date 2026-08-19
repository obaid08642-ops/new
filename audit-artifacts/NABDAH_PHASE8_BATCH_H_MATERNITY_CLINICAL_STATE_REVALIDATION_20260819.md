# Phase 8 — Batch H: maternity clinical-state revalidation

## Result

**REVALIDATED / NO SOURCE CHANGE REQUIRED.** The current authoritative Patient and Backend source already implements the corrective contract for the Phase 2 historical finding: it does not store or display fallback pregnancy facts when no maternity profile exists.

## Confirmed controls

| Surface | Verified behavior |
|---|---|
| Backend profile absence | `GET /maternity/profile` returns only `{ patient_id, profile_ready: false, tracking_mode: null }`; it does not fabricate pregnancy, due date, cycle length, checkups or milestones. |
| Pregnancy setup | The Backend requires a patient-entered due date or LMP date, derives only an explicitly labelled estimate, rejects dates outside its supported estimate range, and retains no hidden local default. |
| Cycle setup | The Backend requires both patient-entered last-period date and explicit cycle length; it does not calculate a cycle/ovulation window without them. |
| Patient display | `maternity/hub` loads only `/maternity/profile`, clears profile state on error, shows setup/no-data rather than fallback facts, and labels all weeks, dates and fertility windows as estimates. |
| Local persistence search | No maternity/pregnancy AsyncStorage or fallback-state pattern was found in the Patient maternity source scope. |
| Safety copy | The six-locale maternity dictionary states that display values are user-recorded data/estimates, not diagnosis, fetal-health confirmation or contraception. |

## Verification

| Gate | Result |
|---|---|
| Maternity contract regression | **PASS** — `maternity.service.spec.ts`: 1 suite, 4 tests covering no pre-setup facts, user-entered-date requirement, explicit cycle inputs and pregnancy-only log rejection. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Branch implication | No source archive change was made because the current `manus/on-live-reconciliation` source already satisfies this specific remediation. This evidence-only closure will be committed separately. |

## Remaining acceptance

Phase 10/11 must still validate the six-language layouts and approved sandbox flow: empty profile → setup → server-confirmed profile → update/opt-out behavior. It must not treat estimated dates as clinical confirmation, activate SOS/QR, or replace patient-entered data with a local fallback.
