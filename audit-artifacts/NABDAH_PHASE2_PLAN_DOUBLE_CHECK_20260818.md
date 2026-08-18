# Nabdah Phase 2 — Plan Double-Check

## Purpose

This checklist compares the current Phase 2 work against the approved phased plan. It is an interim closure review, not a Phase 2 completion declaration.

## Phase scope and current results

| Planned item | Evidence or result | Status |
|---|---|---|
| Use `main` as the default Patient source | `main=53ba7da`; QA is verification evidence only | PASS |
| Inventory Patient screens, routes, actions, and UI states | Current Patient inventory and 2,276 UI action markers recorded | PASS |
| Compare API consumers with Backend routes from the same baseline | 333 Patient calls compared with 1,310 corrected main routes; 301 direct matches and 32 review items | FIX |
| Compare every changed/unique Patient file | Sensitive matrix covers 43 files; broader queue includes feature and release files | FIX |
| Review profile and account flows | Profile, addresses, loyalty, insurance, and edit flows inspected; runtime gate pending | REVIEW |
| Review medication reminders, chronic medicines, and refill/reorder | Main Health contracts match the reminder/refill consumers; ownership/idempotency and runtime tests pending | REVIEW |
| Review nutrition screens | Feature-rich main screens retained; synthetic/default markers and API/state behavior require remediation review | FIX |
| Review cycle, maternity, pregnancy, baby growth, and related screens | Main feature breadth retained; fail-closed and medical-safety behavior require review | FIX |
| Review mental-health screens | Assessment questions/submission contracts identified; crisis and therapist flows require safety/consent validation | FIX |
| Review AI, diagnostics, reports, family, wallet, and support surfaces | Present in the broader inventory; selected API mismatches remain in the remediation queue | FIX |
| Distinguish existing-screen rebuilds from genuine additions | Six dictionaries/tests, medication notification utility/test, and three Provider map files identified as actual additions; Admin has no new pages | PASS |
| Remove or classify fabricated/hardcoded data | Markers were separated from legitimate test mocks; remaining medical/default markers are queued for remediation | FIX |
| Verify loading, empty, error, retry, and offline behavior | Static markers reviewed; runtime verification pending | BLOCKED |
| Verify TypeScript, Jest, and Expo export | Isolated install blocked by lock mismatch and unreachable dependency mirror; no source lockfile changed | BLOCKED |
| Verify security, ownership, consent, and medical-safety behavior | Static contract review started; E2E and mutation checks remain later gates | BLOCKED |
| Perform a line-by-line double-check and commit evidence | This document, closure matrix, decision matrix, and report are committed to QA branch | PASS |

## Explicit non-claims

No new screen is claimed merely because an existing screen was rewritten. No QA-only archive has been silently merged into `main`. No `.env`, Firebase secret, deliberately removed repository, or synthetic production record has been restored. No Phase 2 PASS is declared for a runtime test that could not execute.

## Remaining closure requirements

Phase 2 remains open until the 32 API review items are resolved or explicitly classified, the selected file decisions are finalized, runtime dependencies become installable, Patient typecheck/Jest/Expo gates run, and the complete status is reviewed again against this table. Any source remediation belongs in the planned remediation phase unless a narrowly scoped Phase 2 correction is explicitly justified and tested.


### Subsequent risk-marker pass

A subsequent static scan found 153 marker lines across 77 Patient `main` files. These are not 153 defects: most are legitimate form placeholders or documentation of prior fixes. The scan is recorded in `NABDAH_PHASE2_PATIENT_MAIN_RISK_REVIEW_20260818.md`; only user-visible synthetic medical values, local-only success, or unbacked business defaults will enter remediation. This leaves the existing `FIX`/`BLOCKED` statuses unchanged until runtime and contract evidence is available.


### Corrections after semantic contract review

The initial 32-call count was corrected in stages: the classifier first used the wrong route-column name, then the confirmed Chat/Insurance aliases were expanded. The final alias-aware queue records 9 alias-compatible calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates, with no automatic source edits. Copay is an intentional `/patient/pay-copay` alias, and pharmacy basket approval/rejection are real transitions. These corrections reduce false positives but do not close runtime/build/security gates.


### Patient sensitive-screen button scan

A context-window scan across profile, nutrition, maternity, health, consultations, pharmacy, insurance, and family screens found one unbound action candidate: `profile/addresses.tsx:151` (`إضافة عنوان جديد`). This matches the manually confirmed defect and its remediation test contract. No additional unbound buttons were found in the scanned scope; runtime UI testing remains a separate blocked gate.
