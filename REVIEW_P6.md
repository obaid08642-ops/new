# Phase 6 review (reviewer, 2026-09-27)

**Scope:** `fix/audit-2026-09` at `7691f8f` ("[P6] gate note"), plus the two Phase 6 commits pushed after it: `34d4d7c` (P6.x-13c) and `0221b65` (P6.x-10b). These were merged into `main` on `review/p6`; the reviewer's fixes are in `[REVIEW-P6]` commits.

## Verdict
**Merged with reviewer fixes, but Phase 6 is NOT complete.** What was built now works and is safe to merge. Several plan items are missing or only half wired; they are listed under "FAIL — mandatory for the agent" below. Per AGENTS.md they are not optional and may not be "deferred".

As delivered, the branch had these defects:
1. **The admin panel did not compile.** `admin/src/pages/api/admin/[...path].ts` contained a stray `{ {` (P6 BFF refresh) and a missing line break (P6.x-2b); `sos-monitor.tsx` used a field its type did not declare (P6.x-5). `tsc` failed, so the panel could not build.
2. **3 unit tests failed.** HomeCareSvc spec (missing `EventBusService` provider) and the admin nursing containment spec.
3. **The gate note claims "tsc 0 / nest build 0 (re-verified at push time)".** That was not true for the admin app.

## Reviewer fixes (small, done here)
- **Admin build:** fixed the BFF syntax and the `SosCase.escalated_997` type.
- **F46 security:** admin assign/reassign accepted any provider id. It now accepts only an active, approved home-care provider that offers the booked service (the same rule as `HomeCareSvc.book`). The obsolete 503 containment spec is replaced by a spec that guards this check.
- **BFF refresh (plan: "session survives > 1h"):**
  - The 2FA and passkey login set `admin_refresh` with `Max-Age` of 1 hour, the same as the access cookie, so the refresh-on-401 never had a token after the first hour. It is now 14 days.
  - Refreshed cookies are URL-encoded and `Secure` in production.
- **P6.0 approve/reject (labs, radiology, nursing):**
  - It did not clear the cached public lists, so an approved item stayed hidden until the cache expired. This broke the plan's check "approve → appears in `/labs/services`".
  - It now uses `reviewUpdate` (records the reviewer) and `invalidateCatalogCache`, with a new test.
- **Reports and search:** orders were read from the legacy `orders` collection (0 rows). Pharmacy orders live in `pharmacy_orders`, with the amount in `totals.total`.
- **Labs turnaround report:** it filtered on `status: 'REPORT_UPLOADED'`, but lab bookings use `state` (`RESULT_UPLOADED`/`REPORTED`), so the report was always empty. It now measures to the first result entry in `state_history`.
- **Specialties:** every Arabic-only name slugged to `-`, so all such specialties shared one code and overwrote each other. They now get a stable code per name (new test).
- **Found here, but a Phase 5 defect:** `seed-data/*.json` was not copied to `dist`, so the P5.1 JSON catalog bootstrap never ran in a built app, including production. That covers 252 documents: specialties, insurers and the lab/radiology/nursing additions. Fixed in `nest-cli.json` assets.
  - Once the files were in `dist`, the fresh-DB gate crashed in lab and radiology. The P5.1 export wrote 101 ids as raw UUID bytes (54 of 90 labs, 23 of 44 radiology, 24 of 39 nursing), and those ids reached patients and broke every URL they were used in. The corrupt ids are removed from the JSON (the seeder falls back to the code), the seeder rejects any non-text id, and `catalogs-seed.active.spec.ts` asserts that seeded ids are URL-safe.
- **Merge:** `'support_requests'` → `'supportrequests'` (the real collection) in the P6 disputes, CRM and command-center readers. The disputes center showed nothing.

## FAIL — mandatory for the agent (plan tasks, not done or not wired)
Each item needs a live verification (the harness in `tools/live`), not only a unit test.

| # | Plan item | Problem | Do |
|---|---|---|---|
| R6-1 | F46 | `admin/nursing-portal.tsx` is not wired to the new API. It sends `{nurseId}` (rejected by the DTO), asks for a "license/phone", and reads `patientName`/`serviceType`/`status`, which the API does not return (`patient_id`/`service`/`state`). | Add `GET /admin/nursing/requests/:id/eligible-providers` (same eligibility rule as assign). The page lists the eligible nurses, sends `provider_id`, and shows state, service and scheduled time, plus reassign and cancel buttons. Live check: assign → the nurse sees the job in provider-jobs. |
| R6-2 | BFF | The plan asks for a 1:1 mapping `/api/admin/<x>` → `/api/v1/<x>` with all admin callers updated to real backend paths. The hand-written rewrite rules are still there and keep growing (notifications, business-rules, catalogs). | Do the 1:1 mapping and update the callers; the live gate plus a render of every admin page must stay green. |
| R6-3 | P6.x-7 | Notification templates are stored, but no notification sender reads them, so editing a template changes nothing. | Senders (push/notification queue) resolve the template by key and the user's language, falling back to the built-in text. Live check: edit a template → the next real notification uses it. |
| R6-4 | P6.x-14 | `delivery_fee`/`service_fee` are saved, but no pricing flow reads them. | Pharmacy and home-visit pricing use the saved values. Live check: change a fee → the next quote shows it. |
| R6-5 | P6.x-13 | `app_versions` (force-update and maintenance) is exposed on `/config`, but no app reads it. `/content/home` has no client either. | patient-app and provider-app enforce `min_version` and `maintenance` (a blocking screen); patient-web honours `maintenance`; the home screens render `/content/home` sections. |
| R6-6 | P6.x-2 | The catalog manager has no medicines, insurance+networks+classes tabs, image upload, price history or bulk CSV import. | Build them in the same page. |
| R6-7 | P6.x-1/10 | Reports export CSV only; the plan asks for CSV and XLSX. | Add XLSX. |
| R6-8 | P6.x-5, P6.x-10 | "Deferred" in the gate note: live orders map, 5xx rate, queue health; pharmacy fill rate and quote time, consultation no-shows, nursing visits, user retention cohorts. Deferring is not allowed. | Build them from live data. Where a data source truly does not exist, write `BLOCKED:` with the exact missing source and stop. |
| R6-9 | Gate P6 | The Playwright "click every button and assert backend state" check was not done ("ENV-BLOCKED"). The environment exists: see `tools/live` and the CI `live` job. | Add per-page click tests for the Phase 6 pages to the live harness. |

## Evidence (reviewer ran everything, on `review/p6`)
- Backend: `tsc` 0; `nest build` OK; jest **2871/2871**.
- Admin: `tsc` 0; `next build` OK.
- patient-web: `tsc` 0; vitest 338 passed.
- Admin render of all 62 static pages, signed in, with gate data: **0 broken, 0 4xx**.
- New endpoints called live through the BFF, all 200 with real data: reports (orders, revenue, bookings, labs-turnaround, finance, insurance), search, nursing requests, specialties, templates, pricing, app-versions, FAQs.
- Live gate on a **fresh database** (with the seed-data fix, so 252 more catalog documents are present): P1 0/358; accounts, onboarding, pharmacy, lab, radiology, nursing, consultation, ambulance, facility, support and loyalty all **100%**.

## For the agent (process)
- Build **every** app you touched before a gate note (`admin: npx tsc --noEmit && npx next build`). The Phase 6 note claimed green, but the admin panel did not compile.
- "Admin can edit X" is only done when the product **uses** X. Check that a reader exists (`grep` the collection or config key in the consumers) before calling a settings screen finished.
- When reading data, confirm the real collection and field names on a database the live journeys have filled (`pharmacy_orders`, `state` vs `status`, `supportrequests`).
