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
  (provider-app part, when present: `cd provider-app && npx jest --config jest.acceptance.config.js acceptance/<id>`).
- When the reviewer approves the item, its id is added to `acceptance/DONE`; the
  gate then runs it on every push (`node scripts/run-acceptance.mjs --done`).

| id | item | backend | provider-app | live |
|----|------|---------|--------------|------|
| q79 | Q79: registration sends typed KYC documents (7 types) | `acceptance/q79` | `provider-app/acceptance/q79` | `tools/live/j_onboarding.py` (no KYC upload by the journey) |
