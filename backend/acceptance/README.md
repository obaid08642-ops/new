# Acceptance tests (reviewer-written, tests first)

Owner decision 2026-10-05 (docs/review/HANDOFF.md §2): for every large item the
reviewer writes the acceptance tests FIRST, on a `review/spec-<id>` branch merged
into `fix/audit-2026-09`. They fail on the code as it is and describe the required
behaviour exactly.

- The implementing agent makes them pass and **may not edit, move, skip or delete
  anything under `acceptance/` (backend and provider-app) or the live journeys a
  spec PR changed.** A test that looks wrong is raised with the reviewer.
- They live outside `src/`, so the unit gate stays green while an item is open.
- Run one item: `cd backend && node scripts/run-acceptance.mjs <id>`
  (provider-app part, when present: `cd provider-app && npx jest --config jest.acceptance.config.js acceptance/<id>`;
  patient-web part: `cd patient-web && npx vitest run --config vitest.acceptance.config.ts acceptance/<id>`;
  admin part: `cd admin && node_modules/.bin/jiti acceptance/<id>/<file>.acceptance.ts`).
- When the reviewer approves the item, its id is added to `acceptance/DONE`; the
  gate then runs it on every push (`node scripts/run-acceptance.mjs --done`).

| id | item | backend | provider-app | live |
|----|------|---------|--------------|------|
| q79 | Q79: registration sends typed KYC documents (7 types) | `acceptance/q79` | `provider-app/acceptance/q79` | `tools/live/j_onboarding.py` (no KYC upload by the journey) |
| q86 | Q86 + Q104 + Q99: one Moyasar path and one webhook receiver, `secret_token` checked in every environment | `acceptance/q86` | — | `tools/live/j_payments.py` (webhook: wrong secret 401, shared secret settles) |
| q102 | Q102: no fake web service booking; no copay crash | — | `patient-web/acceptance/q102` | — |
| q89 | Q89 + R23: step-up + permission on every route in the Q66 list; single-use, session-bound ceremony; admin prompt and retry | `acceptance/q89` | — | admin: `admin/acceptance/q89` |
| f2 | F2: coverage-check reads what add-policy and the provider save; benefits-summary per service as providers decided | `acceptance/f2` | — | `tools/live/j_insurance.py`; j_lab, j_radiology, j_consultation green |
