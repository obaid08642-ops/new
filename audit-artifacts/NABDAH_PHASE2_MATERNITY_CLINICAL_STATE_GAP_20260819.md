# Phase 2 Patient — maternity clinical-state gap

## Scope

This review compares the Patient maternity hub with the guarded Backend maternity profile and checkup contracts. The routes are present and method-compatible: `GET/POST /maternity/profile`, `GET /maternity/content`, and `PUT /maternity/checkups/:week/toggle`. The findings concern the authority of medical state and recovery behavior.

| Patient behavior | Backend behavior | Finding | Required disposition |
|---|---|---|---|
| On profile read failure, loads an AsyncStorage profile; if setup was recorded locally but no profile exists, fabricates pregnancy week 28 and a due date 112 days ahead | Backend owns profile creation/update and computes due date/week from explicit due date or LMP; it has its own default only when update lacks both | Local state can be displayed and persisted as a real pregnancy record without Backend confirmation | **P0 FIX — fail closed; require authenticated Backend profile or direct user back to verified setup** |
| Renders fallback week 28 and a generated due date when profile is absent | Backend response is the intended source of truth | A clinical timeline can appear even with no authoritative profile | **P0 FIX — replace with empty/setup state** |
| Immediately persists pregnancy/planning toggle and checkup completion locally before request; API failure only logs to console | Backend persists the requested profile/checkup state and can reject/not find profile | UI and storage can diverge from the medical record with no rollback/retry feedback | **FIX — optimistic state needs rollback, error message, retry, and post-success reconciliation** |
| Builds fertility “AI” advice and says regular-cycle prediction is “highly accurate” from local date arithmetic | Backend profile supplies date inputs; no clinical decision engine is invoked in this screen | Overstated precision and a locally generated clinical-sounding recommendation can be mistaken for medical guidance | **MEDICAL-SAFETY FIX — label as estimate, add limitations/safety copy, and never treat local calculation as diagnosis** |
| Displays fixed fetal size/weight/length content in the hub regardless of dynamic week | A dedicated fetal reference dataset exists elsewhere but the hub does not bind this card to it | Educational content can be wrong for the displayed week | **FIX — derive from reviewed week-specific source or hide until available** |
| Status toggle sends only `is_pregnant` | Backend profile creation can generate a due date/current week when no due date or LMP is supplied | A status toggle can create/alter a pregnancy profile without verified clinical dates | **FIX/BLOCKED — require onboarding/profile inputs before creating or switching to pregnant state** |

## Backend contract observations

Backend profile update accepts explicit `due_date` or `lmp_date`, calculates `current_week`, persists default checkups for a newly created profile, and requires authentication through `JwtAuthGuard`. Backend checkup toggling returns the saved profile and rejects missing profiles. These protections do not prevent the Patient UI from displaying or storing fallback medical truth while disconnected.

## Decision

The maternity journey must remain **medical-safety gated** until authoritative profile, setup, recovery, state-reconciliation, and content rules are implemented and tested. Existing educational navigation may remain discoverable, but no fabricated week, due date, checkup status, or predictive certainty may be presented as patient-specific medical data.
