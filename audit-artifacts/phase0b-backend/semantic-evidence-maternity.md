# Phase 0B semantic evidence — Maternity

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/maternity/maternity.service.ts:2–155`
- `src/modules/maternity/maternity.controller.ts:2–58`
- `src/modules/maternity/maternity.module.ts:2–18`

The controller is JWT guarded and derives the patient ID from `req.user.id` (`maternity.controller.ts:5–15`). It exposes authenticated profile read/update, public-looking `GET /maternity/content`, kick and contraction logs, checkup toggle, and infant-growth writes (`18–58`). The service calculates an estimated current week from due date using a 280-day LMP approximation, bounded to 0–294 elapsed days and weeks 1–42, and explicitly labels estimates as non-diagnostic (`maternity.service.ts:12–19,43–53`). Profile update supports pregnancy mode via due date or LMP, or cycle tracking via last-period date and cycle length 15–90, with basic date/type validation (`55–90`).

Kick and contraction logs mutate embedded arrays after loading the patient profile and return the full profile document (`92–116`). Checkup toggle finds a week string and blindly flips `done` (`118–126`). Infant growth validates broad numeric ranges, updates an existing month or appends a new embedded record, and returns the full profile (`129–154`). `getContent` returns empty links/tips arrays with a comment that content awaits a reviewed/localised workflow (`38–41`).

There is no visible idempotency/replay key, audit event, rate limit, optimistic version or atomic update in the mutation routes. Profile reads can save a derived `current_week` during a GET (`46–50`). The embedded-array mutations rely on read/modify/save and can lose concurrent updates; infant-growth update checks use truthiness so valid zero-like values are not assigned, despite positive validation. The profile response returns the complete persisted profile plus estimate notice. The module registers one Mongoose profile schema and repository and exports the service (`maternity.module.ts:8–17`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: non-atomic embedded-log writes, no mutation replay protection, complete sensitive maternity profile returns, public empty-content contract, data validation/consistency gaps, read-side writes, and absence of clinical safety/alert/lifecycle governance.
