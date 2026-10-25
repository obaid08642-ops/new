# QA findings: B2B procurement, providers map, medical jobs, drug index

Method: API calls as each role on the local stack, each write checked in MongoDB (`nabd_live`). Admin actions via the admin client (`tools/live/j_admin.login`, which uses the BFF login with 2FA). Admin web UI pages were NOT clicked yet.

## Pharmacy B2B procurement (PR-*)

Evidence (IDs are local): request `6addb63a822760596980cbdf` submitted by the pharmacy, then reviewed, quoted, approved by the pharmacy, completed by the admin. DB status went PENDING_ADMIN_REVIEW → QUOTATION_ISSUED → APPROVED_BY_PHARMACY → COMPLETED; `quotations` has the quote doc. Request `6addb668822760596980ce7b` was cancelled by the admin (DB CANCELLED). The pharmacy's `my-requests` showed each status change.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P3 | POST /pharmacy/procurement/analyze-file (text) | file analysis | Send text lines | AI analysis result | 503 `{"code":"INTERNAL_ERROR","message":"ai_provider_unavailable"}`. Test stack has no AI provider key: environment limit, not a product bug. The raw code would be shown to a user if the UI passes it through | backend/src/modules/pharmacy/controllers/procurement.controller.ts:78-84 |
| P3 | POST /admin/procurement/:id/complete | state rule | Complete a request in QUOTATION_ISSUED | Clear rejection | 400 "Cannot complete request when status is 'QUOTATION_ISSUED'. Expected APPROVED_BY_PHARMACY." Correct behaviour, recorded as pass | backend/src/modules/pharmacy/services/procurement.service.ts |

## Providers map (MP-*)

GET /providers/map: 200, 13 active providers; `?type=pharmacy` returns 2; `?type=doctor&lat&lng&radius_km=50` returns 5. Public (no token). Web map page UI and markers not checked yet.

## Drug index (DI-*)

GET /drugs?q=paracetamol with a pharmacy token: 200, returns Panadol Extra 500mg (`cat: pain`). GET /drugs/categories: 200 (`pain` count 5). Guest (no token): 401 `Missing token`. So a guest cannot search the drug index; recorded as the guest result. Web drug-scanner and detail UI not checked yet.

## Medical jobs (JB-*)

Guest (no account, device id):
- GET /recruitment/jobs (public): 0 published jobs at the time of the test.
- POST /recruitment/jobs/guest: 201 `{"status":"draft","pending_review":true}`. DB `job_postings` has the draft with `guest_device_id`. GET /recruitment/guest/mine shows it.
- POST /recruitment/jobs/:id/guest-apply on the draft: 404 "not found or not open for applications". Correct.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P1 | guest job post → admin → public listing | publish step | A guest posts a job. Try to publish it as admin with PUT /recruitment/jobs/:id {status:"published"} | The admin reviews and publishes the draft, so it appears in the public listing (the code comment says "admin publishes") | No route publishes a guest draft. Admin PUT returns 404 "Job posting not found" (the update looks up by facility owner, and the draft's facility_id is `guest:<device>`). The admin web has no recruitment page. So every guest post stays a draft forever | backend/src/modules/recruitment/recruitment.module.ts:151-179 (guest post), :327-334 (PUT jobs/:id), :168 (facility_id guest:) |

Signed-in hospital: POST /recruitment/jobs (status published) → 201, job visible in the public list (1 job). Candidate-profile rule (`cv_url`, `scfhs_license_number`, `scfhs_license_expiry` required; no `headline`). Doctor application needs a candidate profile first (400 "Candidate profile must be created before applying to jobs"). Result of the doctor's apply: see the matrix row JB-05 for the current status.

## Job applications (JB-05, signed in)

Doctor: candidate profile POST /recruitment/candidate/profile 201 (license status "Pending"). Apply POST /recruitment/jobs/:id/apply 201 (`cover_letter` field; `cover_note` is rejected). DB `job_applications` has the doc with status `submitted`.
Hospital: GET /recruitment/jobs/:id/applications lists it. PATCH /recruitment/applications/:id/status with `under_review` 200. DB status `under_review`. Doctor GET /recruitment/applications/my shows `under_review`. Pass.

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P3 | PATCH /recruitment/applications/:id/status | id used in the URL | Use the `_id` from the applications list | Works, or the list returns the id the endpoint expects | 404 "Job application not found" with `_id`. The lookup uses the `id` field (UUID), which the list also returns. Confirm which id the web and app pass | backend/src/modules/recruitment/recruitment.module.ts:274-276 |
| P3 | PATCH applications/:id/status | allowed statuses | Send `shortlisted` | Either accepted or listed in the UI | 400 "Invalid application status". Allowed: submitted, under_review, interviewing, accepted, rejected. Check the hospital UI uses only these | backend/src/modules/recruitment/recruitment.module.ts:285 |
