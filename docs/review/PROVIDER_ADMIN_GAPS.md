# Provider app and admin: gap audit (2026-10-30, main @ 4d64e6089)

Static read of `main`; nothing was run at runtime. Paths: BE = `backend/src/modules`, APP = `provider-app/src/screens`, ADM = `admin/src/pages/admin`. Status: DONE / PARTIAL / MISSING. Spot-checked by grep on main: no `provider/services` call and no `booking_mode` anywhere in `provider-app/src`; no `service-offers` or `refund-policy` anywhere in `admin/src`.

Stale QA findings (`qa/e2e-sweep-account`): provider-services gaps 1-9 (lab/radiology/nurse own price, comparison, home/insurance filters) are FIXED in code by #2116; gap 10 (DTO number vs string) is cosmetic; gap 11 and V-07 are still open (below). The admin `/admin/logs` 404 is FIXED (`BE/admin/admin.module.ts:43-44,150-151`). The recruitment 403 for hospitals and the candidate notification are FIXED (`BE/recruitment/recruitment.module.ts:350-355,307-346`). The patient-session-200 security lead on 10 provider endpoints is closed: each has a route-level `@Roles` (e.g. `BE/provider/provider-ops.module.ts:750`, `provider-facility.controller.ts:28`). `NurseVisitConsole` and `EPrescriptionScreen` stubs are FIXED.

## Blocks go-live (priority order)

| # | Gap | Types | Status | Evidence |
|---|---|---|---|---|
| G1 | Provider cannot set or change own price / offered / home / insurance per service from the app. Backend `GET/PUT /provider/services/:vertical/:serviceId` exists but no app screen calls it. Lab "Test Menu" edits the **global catalogue** row via approval (`BE/approval-workflow/approval-workflow.module.ts:314-325`); radiology only requests a new scan; nursing posts a hard-coded delta that does not map to `nursing_services[]`. | lab, radiology, nursing | DONE (see the state table below) | BE `provider/provider.controllers.ts:554-570`, `provider/services/provider-service-offers.service.ts:32-122`; APP `lab/LabDashboard.tsx:1545-1580`, `radiology/RadiologyDashboard.tsx:536-541`, `nursing/NursingDashboard.tsx:814-960` |
| G2 | Nursing registration sends price 0 per service, so the patient sees the catalogue price until the nurse sets one. | nursing | DONE (see the state table below) | APP `nursing/NursingRegistration.tsx:105`; BE `common/service-offers.ts` (`registeredPrice` rejects 0) |
| G3 | Nursing three booking modes (visit / continuous / programme): nurse inbox shows only the scheduled time; no per-session/recurring handling, no mode in admin catalogue. | nursing, admin | DONE (see the state table below) | BE `home-care/booking-mode.ts:1-82`, `home-care.service.ts:114-146`; APP `nursing/NursingDashboard.tsx:140-163`; ADM `catalog-manager.tsx:35,68` (free-text `duration`) |
| G4 | Lab results: typed rows only, no scanned-file upload; `base64`/`url` accepted but stored inline on the booking, bypassing `/storage` scan and quarantine; released immediately with no review. | lab | DONE (see the state table below) | BE `labs/labs.service.ts:796-858` (827-835 inline); APP `lab/LabDashboard.tsx:511-519,790-818` |
| G5 | Radiology report: `privateProviderStorage` does not require `scan_status==='clean'`; uploader can also approve. | radiology | DONE (see the state table below) | BE `radiology/radiology.service.ts:113-118,275-296` |
| G6 | V-07: admin reject leaves `users.active` true; login blocks only SUSPENDED, so a rejected applicant signs in. Needs owner decision (code comment says "fix and resubmit"; REJECTED to PENDING is a legal transition). | all | DONE (see the state table below) | BE `provider/services/provider-admin.service.ts:204-222`, `provider-auth.service.ts:156`, `provider.enums.ts:52` |
| G7 | Licence expiry captured for doctors only; pharmacy, hospital, lab, radiology, nursing send no expiry, so decision 37.4 (expired licence blocks automatically) and the reminder cron do nothing for them. Cron suspends the profile; propagation to the account/login unverified. | all but doctor | DONE (see the state table below) | APP `registration/DoctorRegistration.tsx:357,373` vs `PharmacyRegistration.tsx:125-141`, `FacilityRegistration.tsx:326-335`, `lab/LabRegistration.tsx`; BE `legal/legal-enterprise.service.ts:253-283` |
| G8 | Admin has no screen for per-provider service offers (`GET admin/service-offers/:vertical`). | admin | DONE (see the state table below) | BE `provider/provider.controllers.ts:567-571` |
| G9 | Admin has no UI for the refund/penalty policy (`GET/PUT admin/refund-policy`); decision 26 says every value is admin-editable. | admin | DONE (see the state table below) | BE `refund-policy/refund-policy.controller.ts:23-36` |

## Per provider type

| Capability | Lab | Radiology | Nursing | Pharmacy | Doctor | Hospital/clinic |
|---|---|---|---|---|---|---|
| Registration + KYC + admin gate | DONE (`lab/LabRegistration.tsx:108-178`) | DONE (`:276`) | PARTIAL, G2 | PARTIAL, G7 (`registration/PharmacyRegistration.tsx:125-141`) | DONE | PARTIAL, G7 |
| Own price / options after registration | PARTIAL, G1 | MISSING, G1 | MISSING, G1 | n/a (SFDA review) | pricing via delta approval (`BE/provider/provider-ops.module.ts:581`) | n/a |
| Orders inbox | DONE (`LabDashboard.tsx:99,273`) | DONE (`RadiologyDashboard.tsx:111`) | DONE (`NursingDashboard.tsx:88-90`) | DONE (`BE/pharmacy/pharmacy.controllers.ts:90-130`) | DONE (`DoctorHomeTab.tsx:129`) | DONE |
| Accept / decline | DONE (`:415,451`) | DONE (`:262-265`) | DONE (`:149,159`; reason fixed `provider_declined`) | DONE (offers, `:349-362`) | DONE | DONE |
| Schedule / slots | PARTIAL (no per-service capacity) | PARTIAL (shifts via delta review) | DONE (`:779,1222`) | n/a | DONE | DONE |
| Results / report | PARTIAL, G4 | DONE with G5 (`RadiologyDashboard.tsx:405-455`) | DONE visit notes (`NursingFieldOps.tsx:131`) | n/a | e-prescription DONE (`BE/prescriptions/prescriptions.service.ts:44-65`) | n/a |
| Earnings credit + payouts + bank approval | DONE (`BE/provider-ops/provider-ops.module.ts:56-95`; `payouts/provider-payouts.controller.ts:54-93`) | DONE | DONE | DONE | DONE | PARTIAL: credits go to the practitioner; facility wallet is a revenue sum (`hospital.service.ts:312-322`) |
| Chat / calls | PARTIAL (no booking thread) | MISSING | DONE chat, no call (`NursingDashboard.tsx:1130-1175`) | DONE chat (`pharmacy.controllers.ts:442-460`) | DONE (`VideoCallRoom.tsx:119-216`) | n/a |
| New-booking notification | DONE (`BE/notifications/notifications.service.ts:669-693`) | DONE | DONE | DONE | DONE | DONE |
| Profile / docs / settings | DONE; expiry G7 | PARTIAL (`RadiologySettingsScreen` is a menu) | DONE | DONE; QR catalogue is a placeholder (`shared/RealScreensExtended.tsx:17`) | DONE | DONE |

Other provider gaps:
- Pharmacy: stale text says price is capped at SFDA (`APP pharmacy/PharmacyBroadcastResponse.tsx:164`; the server no longer caps, `BE/pharmacy/pharmacy-offer.service.ts:257-290`). No manual mapping UI for unmapped lines (heuristic sku match, `:262-290`).
- Hospital: single-facility scalar membership, invitee must be registered, no cancel route (`BE/hospital/services/hospital.service.ts:60-118`); owner-set passwords and `user_exists` block (`hospital-staff.module.ts:54`); `/hospital/staff` declared in two controllers, the soft-remove in `hospital-staff.module.ts:103-118` is probably shadowed by `hospital.controller.ts:33-46` (needs runtime check); no facility payout split; medical complex has no type.
- Offers store insurance as a boolean only (no companies/classes, decision 30).

## Admin

| Area | Status | Evidence | Gap |
|---|---|---|---|
| Provider approval (list/approve/reject/changes/suspend/docs/delta) | PARTIAL | `ADM/provider-moderation.tsx:143,212,246`; `components/ProviderFullDetail.tsx:174,525` | G6 |
| Bank approval | DONE | `BE/provider/services/provider-admin.service.ts:234-245`; `ADM/provider-moderation.tsx:176` | no reject path; approves all pending banks at once |
| Catalogue CRUD (labs, radiology, nursing, medicines, proposals) | DONE | `ADM/catalog-manager.tsx:60-68`, `medicines-catalog.tsx`, `service-proposals.tsx:88` | G3; `sample_type` free text (`:30`) |
| Provider service offers view | MISSING | G8 | |
| Orders, refunds, returns, disputes | DONE | `BE/admin/enterprise/admin-orders.controller.ts:20-94`; `ADM/orders/index.tsx`, `returns.tsx`, `disputes.tsx` | |
| Refund policy | MISSING (UI) | G9 | |
| Payouts, commissions | DONE | `ADM/payouts.tsx:36-64`, `finance-suite.tsx:36,69`, `commissions.tsx` | two payout systems (withdrawals vs payouts); finance decisions use `window.prompt/confirm` (`finance-suite.tsx:36`) |
| Users, RBAC | DONE | `ADM/users-management.tsx`, `rbac.tsx` | native `confirm()` for suspension (`:119`) |
| Logs | DONE | `BE/admin/admin.module.ts:150-151`; `ADM/logs.tsx` | `AdminMedicalAccessController` (PDPL access log) has no page |
| Reports, scheduled reports | DONE | `ADM/reports.tsx`, `scheduled-reports.tsx` | |
| Content / SEO | PARTIAL | `ADM/article-review.tsx:73`, `content-growth.tsx`, `system-ops.tsx:15-20` | no SEO page editor, indexing controls only |
| Settings / switches / urgent-help number | DONE | `ADM/module-switches.tsx`, `kill-switches.tsx`, `config-portal.tsx:68,77` | GET/PUT use different path prefixes (`:68` vs `:77`), unverified |
| Facility members / rosters / invitations | MISSING | `docs/product/FACILITY_ACCOUNTS_AUDIT_2026-10-23.md` | no admin endpoint or screen |
| Jobs | PARTIAL | `ADM/guest-jobs.tsx` | guest jobs only |
| Licence expiry monitoring | PARTIAL | `BE/provider/services/scfhs-license.service.ts:86-100` | no "expiring soon" list; recheck is a no-op if SCFHS not configured |

## Backend gaps for session S (one line each)

1. G6 reject must deactivate the user or login must refuse REJECTED (owner decides).
2. G4 lab report `base64`/`url` bypass `/storage` scan; add scanned upload plus a release step.
3. G5 radiology: require `scan_status==='clean'` at attach; require a reviewer other than the uploader.
4. G7 persist and enforce licence expiry for pharmacy, hospital, lab, radiology, nursing; propagate profile suspension to the account.
5. Nursing `settings/delta` accepts a shape that does not map to `nursing_services[]`; reject price 0 at registration.
6. Insurance per offer is a boolean; decision 30 needs companies and classes.
7. `test_prices`/`scan_prices` DTO typed number, app sends strings (`provider-onboarding/provider-onboarding.dto.ts:597,602`).
8. No bank-account reject endpoint; no admin licence-expiry list endpoint; no facility membership/invitation admin endpoints; invitation `cancelled` has no route.
9. `/hospital/staff` declared twice (shadowing); creditEarning silently skips when `collected` is 0 or no account (`provider-ops.module.ts:87-96`).
10. Recruitment: no status-transition rule, no application messages (owner decision).

## Implementation order (one PR per item)

1. G1 + G2: shared "My services and prices" screen in the provider app for lab, radiology, nursing using `/provider/services/:vertical`; nursing registration stops sending 0 (tests: price validation, patient list shows own price).
2. G3: nursing booking-mode display and per-session handling in the nurse inbox; mode field in the admin nursing catalogue.
3. G4 + G5: scanned result upload for labs through `/storage`, clean-scan and two-person release for radiology (tests: medical results).
4. G6/G7: owner decision, then licence-expiry fields in the five remaining registrations.
5. G8, G9: admin screens for service offers and refund policy.
6. Radiology and lab booking chat; pharmacy stale text; admin facility membership view.

## UX per flow (owner standing rule 2026-10-30)

Rating is inferred from reading the code and screens, not from using the apps: smooth / clunky / broken. Clunky and broken rows are fixed in the PR that owns the flow.

| Flow | UX | Why |
|---|---|---|
| Lab / radiology / nursing: set or change own price, home, insurance | broken | No screen calls the offers API (G1); lab edit changes the global catalogue through approval, nursing posts a delta that changes nothing the patient reads |
| Nursing registration prices | clunky | Generic visit/hour/day/month fields, then price 0 per service (G2) |
| Lab and radiology registration | smooth | One wizard, documents and maps in place; no expiry date (G7) |
| Inbox and accept / decline (all types) | smooth | One queue, one tap each; nursing decline has a fixed reason only |
| Nursing booking mode (visit / continuous / programme) | broken | Nurse cannot see the mode (G3) |
| Lab results | clunky | Typed rows only, no scanned file (G4) |
| Radiology report | clunky | Upload, submit, approve are three steps and the same person can do all (G5) |
| Lab and radiology chat with the patient | broken | No booking thread (radiology has none at all) |
| Payouts and bank approval (provider) | smooth | Withdrawal blocked with a clear state until the bank is approved |
| Hospital staff (three creation flows, two `/hospital/staff` controllers, owner-set passwords) | clunky | Duplicated flows, existing users rejected |
| Nursing "services" and "pricing" settings (two delta screens) | clunky | Duplicate screens that wait for approval and change nothing |
| Pharmacy offers | smooth | Stale cap text at `PharmacyBroadcastResponse.tsx:164` is misleading |
| Admin: reject provider | broken | Rejected applicant can still sign in (G6) |
| Admin: payouts | clunky | Two parallel payout systems; decisions via `window.prompt` / `confirm` (`finance-suite.tsx:36`) |
| Admin: users suspend, GDPR delete | clunky | Native `confirm()` (`users-management.tsx:119`, `gdpr.tsx:13`) |
| Admin: nursing catalogue | clunky | Free-text duration instead of booking mode (G3) |
| Admin: refund policy, provider service offers | broken | No screen (G8, G9) |
| Admin: orders, returns, disputes, catalogue, logs, reports | smooth | Complete lists and actions |
| Admin: provider approval | clunky | Two approve paths in the backend; approve bulk-approves pending documents and banks |

Duplicates to merge (listed, not yet changed): two payout systems (admin), two approve paths (`providers.service.ts` and `provider-admin.service.ts`), three staff-creation flows, two nursing delta screens, two `/hospital/staff` controllers.

## State 2026-11-10 (lane V, checked against main)
All nine gaps G1-G9 are done on main; the Status column above is the original finding, now marked DONE, with the evidence in the state table below. Cells of the per-type and admin matrices that named them are therefore stale: lab/radiology/nursing "own price after registration" (G1: `MyServicesScreen` for the three verticals), nursing registration price (G2: a price per chosen service is required), nursing booking modes (G3), lab/radiology results and report (G4, G5), licence expiry for every type (G7) and the admin "expiring soon" list (`admin/src/pages/admin/license-expiry.tsx`), provider service offers and refund policy in admin (G8, G9), the pharmacy QR screen (reads the real public page, no placeholder), lab and radiology booking chat (#2559).

**Still open, nothing owner-blocked among the first two:**
1. Lab: schedule has no per-service capacity (slots are per provider, not per test).
2. Admin jobs: only guest jobs are reviewed (`guest-jobs.tsx`); jobs posted by facilities (`POST recruitment/jobs`) have no admin list or moderation.
3. Owner-blocked: the duplicate merges (`PROVIDER_ADMIN_MERGE_MAP.md`) and a per-page SEO text editor (no specification).

## State (updated 2026-10-30)

G6 decided by the lead: a REJECTED applicant signs in, sees only the rejection reason and a fix-and-resubmit flow for the fields/documents admin named (REJECTED to PENDING_REVIEW, admin notified); no provider feature, listing or bookings until approved again; SUSPENDED stays blocked.

| Item | PR | State |
|---|---|---|
| Audit | #2166 | merged |
| G1 My services and prices | #2170 | merged |
| G2 nursing registration price | #2175 | open |
| G4 + G5 lab results via /storage, radiology two-person publish | #2177 | open |
| G3 nursing booking modes (nurse inbox + admin catalogue) | #2179 | open |
| G7 licence expiry for every type + reminder | | done on main (checked by lane V, 2026-11-09): pharmacy, lab, nursing and facility registrations send `license_expiry_date` (`PharmacyRegistration.tsx:140`, `LabRegistration.tsx:177`, `NursingRegistration.tsx:138`, `FacilityRegistration.tsx:341`) and `provider-onboarding.module.ts` submit refuses a bad or past date through `facilityLicenseProblems` (`license_expiry_invalid`); PV-08/PV-09 journey in #2455 |
| G6 reject: reason + fix and resubmit | #2555 | the app screen (`PendingDashboard.tsx`), resubmit (`POST /provider/onboarding/submit`, REJECTED to pending, reason cleared) and the journey `j_provider_resubmit.py` were already on main; #2555 makes the server refuse a rejection without a reason (5+ characters). Not done: a server gate that keeps a rejected or pending account off other provider routes (wider than G6, needs a decision) |
| G8 admin per-provider service offers | 40bb5474 (audit round 3) | on main: `admin/src/pages/admin/service-offers.tsx` (menu entry, filter, retry) |
| G9 admin refund-policy UI | 40bb5474, #2547 | on main: `admin/src/pages/admin/refund-policy.tsx` edits every value; #2547 adds the table in force. The owner's 2026-11-09 decision (late cancel = 50% card refund or one free reschedule within 14 days, no wallet; provider cancel/no-show 100%) is Z's backend work, not shown as editable until built |
| G4 lab results through /storage with a scan | on main | checked by lane V 2026-11-09: `labs.service.ts` `uploadReport` refuses raw `base64`/`url` (`raw_report_file_not_allowed`) and takes only a scanned `/storage` object (`labs.report-storage.spec.ts`) |
| G5 radiology report: scan and two people | on main | checked: `privateProviderStorage` calls `assertScanned`; `approveReport` refuses whoever uploaded or sent for review (`report_reviewer_must_differ_from_uploader`, `radiology.service.report-storage.spec.ts`) |
| lab and radiology booking chat (provider side) | #2559 | merged: shared `BookingChatScreen` on the lab and radiology order details; the backend thread already existed |
| facility members admin view | on main | `admin/src/pages/admin/facility-members.tsx` |
| SEO publishing controls (admin) | on main | on/off per route in `admin/src/pages/admin/system-ops.tsx` (`GET/POST admin/ops/seo/controls`). A per-page SEO text editor does not exist and is not specified: needs a product decision |
| rest: jobs board admin view, merge duplicates (two payout systems, two approve paths, three staff-creation flows, two nursing delta screens, two `/hospital/staff` controllers) | | todo; the merges change behaviour and need a merge map approved by the owner first (AGENTS.md: merge or delete nothing before the map is approved), so they are not started |

Method: one branch `p/<item>` from main per PR; provider-app and backend need `npm ci --legacy-peer-deps` (provider-app also `--ignore-scripts`); gate = jest of the touched area, `tsc --noEmit`, `nest build`, dtolint, dtocheck (run `node tools/audit/dtocheck.js` from the repo root).
