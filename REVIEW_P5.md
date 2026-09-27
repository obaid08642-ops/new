# Phase 4 + 5 review (reviewer, 2026-09-27)

**Scope:** `fix/audit-2026-09` up to `b3de7c8` ("[P5] gate note"), which includes the Phase 4 commits, merged with `main`.

`main` already carried Phase 4 (PRs #202 and #203) and the live-journey fixes (PR #205). The agent's branch re-applied the same Phase 3/4 work as different commits, so the merge produced 72 conflicting files. The reviewer resolved every one by hand; the rules and choices are below. The result was tested end to end.

## Verdict
**Approved after reviewer fixes.** As delivered, Phase 5 was not shippable. Two problems:
1. **The backend did not start.** `admin.module.ts`, `pharmacy.module.ts` and `provider.module.ts` each had a double comma (`Controller,,`) in their `controllers` array. That leaves an empty slot, and Nest crashes at boot ("Cannot read properties of undefined (reading 'name')"). The P5 and P6 commits were therefore made without ever starting the app. The agent fixed this later, in P7 (`d0e4783`); the fix is ported here.
2. **27 unit tests failed** at `b3de7c8`, although the gate note says "contracts green". They were in MCP, AI commerce, SEO category popularity, the entity pipeline, catalog publication, the entity graph and master-e2e. The P5.1 catalog rename (`medicines_master` → `medicines`, `labservices` → `lab_services`, …) was not applied to those tests' collection mocks. Fixed here: the backend is now **2812/2812**.

## Other defects found and fixed
- **The P5.1 rename missed `homecareservices`.** Seven readers still used it: provider onboarding (nurse services were saved **empty**, so no nurse could be booked), SEO controller, packages, entity pipeline, catalog publication, admin SPA and search. All now use `CATALOG_COLLECTIONS.nursing_services`.
- **Security fixes from the P3 live gate were lost** when the agent rewrote the same code:
  - `POST /provider/profile/delta` and `/provider/score/recompute` were open to patients again;
  - one reader used the non-existent `patientprofiles` collection.
  Both are restored; `src/common/gate-p3-live.spec.ts` guards them.
- Duplicate declarations that each side added, now deduplicated: `FreeformConfigObjectPipe`, `ScheduleSettingsDto`, `SubmitReportForReviewDto`, and `payment_method` on the pharmacy order.
  - The kept `ScheduleSettingsDto` matches what NursingDashboard sends (`shifts` as an object).
  - The pharmacy order `payment_method` has no default, so an order is not pre-marked as cash.

## Conflict resolution rules
- **DTOs:** `main`'s shapes are the ones verified against the real client payloads (live journeys). Fields that existed only on the agent's side were kept, e.g. `ManualRequestDto` and the pharmacy order fields.
- **Files the agent moved or deleted in P5.3:** the move is kept.
  - `main`'s edits to the old paths were ported to the new paths. Most were identical; `home-care-compat.dto` carried the live nursing fixes.
  - The 27 relocated compat controllers received `main`'s changes through a per-class 3-way merge (support chat, facility inbox/tracker/calendar, AI interactions, B2B voice).
- **P5 design decisions kept:**
  - the retired CompatModule;
  - the removed duplicate delta routes in `AdminController` (F49);
  - the canonical catalog collections;
  - the deleted dead controllers (`doctor-integration`, `tour`; no client calls them);
  - the provider offerings overlay.
- **`main` decisions kept:** the deleted duplicate `radiology/controllers/radiology.controller.ts`, which shadowed the real booking routes.

## Evidence (reviewer ran everything)
- Backend: `tsc` 0 errors, `nest build` OK, jest **2812/2812**.
- Apps: provider-app jest 14/14 and tsc 0; patient-app jest 94/94; admin tsc 0; patient-web `tsc` 0 and vitest 337 passed.
- Static gates: dtocheck 0 mismatches, idemcheck 0, schemadrift 0.
- Live gate on a **fresh database** (the same as a new deployment), `tools/live/run_gate.sh`:
  - gate P1: 340 admin/provider write routes, 0 answered 2xx to a patient token;
  - accounts, onboarding, pharmacy, lab, radiology, nursing, consultation, ambulance, hospital, support and loyalty: all 100%.
- Journeys with open findings (insurance, returns, chat, admin ops) show exactly the known LJ items, nothing new.

## For the agent (process)
- Start the backend (`node dist/main.js`) and run `bash tools/live/run_gate.sh` before every phase gate note. CI now runs the same gate on every PR.
- When renaming a collection or moving code, `grep` the old name across `src` **and the specs**, and re-run the full jest suite.
- Do not rewrite code that carries a reviewer fix without keeping the fix. The `gate-p3-live` spec exists to catch this.
