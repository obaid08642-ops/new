# Provider app and admin: screens audit, round 3 (client wiring)

Round 3 covers the provider-app screens and the admin pages that rounds 1 and 2 (`docs/qa/screens-audit-2.md`, `docs/qa/provider-screens.md`) did not, and the admin money screens. Four read-only passes read **both** the client call and the backend controller/DTO/service. They reported 144 lines (36 doctor-side and shared provider screens, 29 pharmacy/lab/radiology/nursing/facility, 39 other admin pages, 40 admin money screens, some previously reported). Each fix below was re-read in code before it was changed. **Nothing was run on a live stack or a device.**

Money screens: client wiring only (field names, `res.ok`, hard-coded rates, texts that contradict the backend). No amounts, rules or ledger logic were changed.

## Fixed (client unless a path says backend)

### Admin money screens
| Screen | Defect | Fix |
|---|---|---|
| `payouts.tsx` | a reason under 10 characters silently did nothing; provider column read `provider_name`, which the queue does not return | shows the error; falls back to provider type and id |
| `commissions.tsx` | hard-coded rate table and header text; load errors turned into zeros (`.catch(() => null)`); detail table read fields the ledger rows do not have; rule form shown to roles that get 403; rule history failure hidden; `service` scope without a service type | rate computed as commission ÷ gross; errors shown; columns are the ledger's real fields (`providerName`, `baseBill`, `systemCommission`, `vatOnCommission`, `providerEarning`); form gated by `finance.config.edit`; messages |
| `financial-ledger.tsx` | commission and VAT recomputed on the page with hard-coded rates that contradict the stored values; issue-quote ignored `res.ok` (success alert after a refusal); warehouse order typed with fields the document lacks (`id`, `pharmacyName`, `quantity`, `name`); button without permission gate; partial prices accepted; failed loads silent; two cards mislabelled; footnote wrong | shows the server's stored amounts; checks `res.ok`; uses `_id`, `pharmacy_id`, `requested_quantity`, `raw_name_string`; gated by `pharmacy.inventory.edit`; every item must be priced; load failures raise the banner; labels and footnote corrected |
| `disputes.tsx` | refund decisions sent no booking (the server needs `booking_kind` and `booking_id` unless the ticket has them); "to the patient wallet" wording although the refund goes to the original payment method; error shown behind the modal; review button without the `disputes.resolve` gate; `refund_full` had no amount field | booking inputs when the ticket has none; wording; error inside the dialog; gate; optional amount. Backend: the list now returns `booking_kind` and `booking_id` (`admin-disputes.controller.ts`, two read-only fields) |
| `returns.tsx` | approve/reject shown to every role; pharmacy response, admin note and attachments never shown; raw English status; a short rejection reason silently ignored | gate `finance.payout.approve`; shown; labels; message |
| `refund-policy.tsx` | every save failure became "try again"; the page said every value applies at once | the server's message (invalid fields, 403); a note that two stored fields and the patient refund-request windows are not driven by this policy |
| `finance-suite.tsx`, `reports.tsx` | the `to` date was sent as a bare date, so the last day (today) was excluded from revenue, commissions, statement and every report/CSV/XLSX; "wallet credits" card although no patient wallet exists; statement summary printed raw English keys; commissions table read as if it included override rules | end of day; card removed; Arabic labels; note |
| `insurance-queue.tsx` | load errors turned into empty queue and zero counts; four states had no card or label; drawer read fields the request lacks | errors shown; states added; `rejection_reason` |
| `pharmacy-price-review.tsx` | every failure became a fixed text; resolve buttons without the price permission | server message; gated |
| `content-growth.tsx` | the coupon form could not set the per-user limit (every coupon got 1) | field added |

### Other admin pages
| Page | Defect | Fix |
|---|---|---|
| `segments.tsx` (+ backend DTO) | rules sent `operator` while the server reads `op`; the field list was treated as objects (the server returns strings); the DTO accepted no `value` at all, so a preview or save with a value was refused | `{field, op, value}` with an operator select and the string field list; `SegmentRuleDto` gained `value` and `value2` (`admin-segments.dto.ts`, free-form, commented) |
| `legal-policies.tsx` | a failed read opened an empty editor and saving it overwrote the real policy; a failed save closed the editor and lost the text | no editor on a failed read; closes only on success |
| `notification-center.tsx` | "retargeting started" shown after a failure and without a confirmation; send/cancel failures said only "failed" | confirm; success only when accepted; server message |
| `config-portal.tsx` | the SLA save said it succeeded after a 400 or 403 | checks `res.ok`, shows the message |
| `appointments-oversight.tsx` | cancel used a fixed reason "admin_cancel" (stored and shown to the patient); load failure looked like "no appointments" | the admin writes the reason; error with retry |
| `broadcast-monitor.tsx` | read `status`, `response_count`, `expires_at`, which the broadcast document does not have; load failure looked like "no active broadcast" | reads `lock_state`, `responses`, `round_expires_at`; error |
| `audit-logs.tsx` | the actor column read an `actor` object the service never stores | `admin_name` / `admin_id` |
| `system-ops.tsx` | language state started as `ar-u-ca-gregory` while the options are ar/en/ur: wrong column, overrides saved under a wrong key | `ar` |
| `impersonation.tsx` | user search sent `search`, the list reads `q` | `q` |
| `provider-moderation.tsx` (round 2) | see round 2 | |

### Provider app
| Area | Defect | Fix |
|---|---|---|
| E-prescription | duration chips "2 weeks", "1 month", "مستمر" broke or mis-converted (`parseInt`) | `durationDays()`; "Ongoing" removed (the server needs a number) |
| Medical report | sent the localized label as `type` (the server silently stored `clinic_note`); generic error | enum id plus title; the server's message |
| Reviews (two screens) | read `rating`, `author`, `date` while the rows carry `score`, `user_name`, `createdAt`: stars, names and dates blank; reply offered on unpublished reviews; load failure = "no reviews" | `utils/reviews.ts`; reply only when published; error with retry |
| CRM hub | each save dropped the patient's tags and re-dated every note | keeps tags, note ids and dates |
| Prescription templates | saved `{med, dose}` while the e-prescription screen reads `{name, ...}` | same shape on both |
| Doctor leaves | toast said patients cannot book although a facility-linked doctor's leave is pending | says it is pending the facility |
| Patient file | the overview showed one invented record (diabetes, penicillin, "12 visits") for every patient; the visits tab listed three invented visits | shows what the request carries (chronic, allergies, blood type) or "—"; the visits tab says it is not available here |
| Statistics | month and year bars labelled Jan–Dec / 1–12 although they are 12 rolling slices | numbered |
| Promotions | a new promotion (`pending_review`) showed as "archived" | status labels |
| Pharmacy | "my previous requests" always empty (reply is `{data: [...]}`); the voice tab was a fake recorder with a fixed "00:14" timer and a send button that sent nothing; inventory load failure = "no items"; settings showed invented defaults and sent field names the server does not know, so nothing was ever applied | reads `data.data`; the voice tab says it is not available and points to Manual / Scan; error with retry; settings load the saved radius and fee and send `max_delivery_radius_km`, `delivery_fee` (min-order and insurance toggle removed: no profile field exists, insurance has its own screen) |
| Lab | insurance reject had no reason field (the server refuses without one); error hid the server message; sample-tracking load failure = "no samples" | reason field; messages; toast |
| Insurance requests | insurer name read `policy.company` (stored as `company_name`) | both |
| Facility | leave requests read camelCase (server sends snake_case) and swallowed load errors; audit log read `user`/`date` (server: `actor`, `created_at`); calendar read fields the server does not send and swallowed load errors | mapped; errors shown |

## Backend gaps (one line each, file:line from the passes; not changed here)
1. `medical-orders/medical-orders.service.ts:45,89,175` visited states are lowercase while appointments are stored uppercase (`schemas/appointment.schema.ts:21-30`): the medical-order visit list is empty and sending always fails.
2. `provider/provider.controllers.ts:425` medical-report and sick-leave look up `provider_requests` by id; appointments never create one, so both return 404 for a normal appointment.
3. `provider-production/provider-production.dto.ts:155` referrals accept only lab, radiology or nursing as target; the screen offers specialties.
4. `labs/labs.service.ts:304-319` the patient booking endpoint is what the "request a test" screen calls for a patient; it needs `scheduled_at`, `items` as `{service_id}`, and books for the caller.
5. `provider-ops.module.ts:261` `myBlacklist` returns no patient name; `:272-285` `putPatientCrm` rebuilds the whole document (a partial patch wipes tags, notes, vip, favourite); `provider-ops` and `provider-production` keep two CRM stores that diverge (`:241,305-310`).
6. `provider-ops.module.ts:298` `isBlacklisted` is never called and nothing reads the CRM `blocked` flag: "blocks booking" is untrue.
7. `provider-ops.module.ts:514,556` consultations counted from `doctor_appointments`, ratings read from `rating/value/stars` while `ratings.module.ts:66-77` stores `score`: statistics undercount and the rating is always null.
8. `livekit/livekit.service.ts:110-122` the waiting room returns every service type with no `service_type` field.
9. `provider-production.module.ts:239-285` the CRM list adds served patients that `getCrm` then answers 404.
10. `ai` / `home-care/home-care.controller.ts:65-66` `POST /nursing/notes` is nurse-only, so the AI copilot save cannot work for a doctor.
11. `provider/services/provider-profile.service.ts:44` `specialty` and `degree` are not editable through `PATCH /provider/profile`.
12. `medicines/medicines.service.ts:1842-1850` the suggest-change whitelist has `storage_conditions`, not `storage_conditions_ar`.
13. `provider-production.module.ts:439-455` no subscriptions or ads module exists: "Pay & launch ad" only inserts a pending promotion with no payment; the profile returns no plan fields.
14. `pharmacy/pharmacy_ops.controller.ts:30` refills always answers 503 `canonical_pharmacy_flow_required`.
15. `pharmacy/pharmacy-b2b-voice.controller.ts:16` voice-to-order exists; the app has no recorder.
16. `radiology/radiology.service.ts:285-286` approving a report is refused for the uploader; the app cannot tell who uploaded, so the button is shown to them.
17. `radiology/radiology.service.ts:442` the radiology availability tab saves `radiology_schedule`, which nothing reads.
18. `home-care/nursing-compat.controller.ts:76-80` coverage verification needs lat/lng; the screen has no location input and sends the radius; the neighbourhood list in the app is fixed text.
19. `home-care/home-care-compat.module.ts:354` medical-supplies request needs a `booking_id` the screen does not have.
20. `provider/provider-facility.controller.ts:62-77` patient tracker, QR check-in log: only `{id, name, phone, email}`; `:42-60` the calendar has ids and no names; `hospital/services/hospital.service.ts:299-306` staff have no licence expiry, malpractice or department-active fields (credentialing, departments); `insurance-engine.module.ts:505-508` the claims hub receives only three states and different field names; `facility-ops.module.ts:377` bed rows carry no admission id.
21. `admin/enterprise/admin-disputes.controller.ts:78-83,108` `refunded_so_far` sums a wallet store; refunds are ledger rows with `ref_id = dispute_<id>`, so it is always 0 (FOR F). `:169-171` `refund_full` without an amount refunds up to the cap, not the booking's paid total.
22. `admin/enterprise/finance-suite.service.ts:312-330` the payout queue returns no provider name (join `provider_profiles`); `:132` `gateway_refunded` counts only fully refunded payments; `:135-138` wallet credits come from a store that no longer exists; `:157-200` ignores override rules (FOR F).
23. `insurance-engine/insurance-engine.module.ts:181` `accrue()` has no internal caller, so the commissions KPIs and the by-service table stay at 0; `admin/web-core/controllers/finance.controller.ts:94-99` the legacy `CommissionLedger` is only read, nothing writes it (FOR F). `:949-953,982` patient refund requests use fixed windows, not the refund policy.
24. `refund-policy/refund-policy.controller.ts:49,51` `home_visit.patient_absent_percent` and `pharmacy.refund_delivery_fee_before_dispatch` are stored and never read.
25. `admin/web-core/controllers/admin-extended-operations.controller.ts:28-48` issue-quote has no status guard (an already quoted request can be re-priced), does not recompute the total, takes no reason; no consumer reads `unitPrice` (FOR F).
26. `common/step-up.guard.ts:126-134` + `admin.controller.ts:470,495,530,598` ban/unban/delete user and `loyalty.controller.ts:77-95` loyalty writes require a step-up token; the admin BFF forwards no such header and the app has no step-up flow, so these actions answer 403 for any admin with a passkey.
27. `common/support-session-context.controller.ts:15`, `admin-impersonation.controller.ts:41` impersonation: the page uses the generic route; the dedicated BFF routes under `pages/api/admin/impersonation/*` (support cookie) are never used, so a session is created and audited but the page shows failure.
28. `admin/enterprise/admin-governance-controls.controller.ts:202` the pharmacy price-override page reads the catalogue change log instead of `GET /admin/pharmacy/price-overrides` (`pharmacy.controllers.ts:227`).
29. `care/appointments.service.ts:353-357` admin appointment list returns no names.
30. `business-rules/business-rules.module.ts:155,292-306` surge and fee updates take no reason and write no audit; `web-core/controllers/admin-config.dto.ts:3-14` `SlaDto` has no bounds.
31. `admin/web-core/controllers/admin-governance.controller.ts:72-95` fraud-alerts page 2+ repeats the live rows (no skip).
32. `health/health-dashboard.controller.ts:~100-110` the cron list is static, with fixed statuses.

## Left as found (not fixed here)
Provider: referral (specialty target), request-a-test (wrong endpoints), PatientFile CRM partial-patch (needs gap 5), AI copilot, subscriptions/ads, nursing coverage and supplies, radiology availability, facility announcements/resources/shifts/sub-accounts/departments/surgery rooms/settings name (cosmetic or need gap 20), pharmacy refills. Admin: `users-management` and `loyalty-config` step-up (gap 26), `crm` and `impersonation` start (gap 27), `price-override-audit` (gap 28), `ai-control` swallowed errors, `risk-dashboard` rescore, `provider-audits`, `shortage-reports`, `image-suggestions`, `fraud-monitoring` and `dashboard` health strip (silent failures), `system-ops` queue selection and reason prompt, `config-portal` surge/fees (gap 30).
