# End-to-end journey UX audit (lead order 2026-10-30 15:42): first pass

## Coverage, stated plainly

This pass is NOT the full walk the order asks for. Nothing below was walked end to end as a real user in Arabic and
English on web and app in this session. The rows come from defects already reproduced and written up in
`docs/qa/findings/*.md` (each row cites its source), mapped onto the journeys the order lists. Journeys with no row yet are
listed under "Not yet walked", so they are not read as clean.

Owner rules applied: P0 and P1 rows name the session that should take them. "Session" names follow the lead's split:
backend, patient-web, admin, provider-app. Severity: P0 = a patient or money is harmed or the flow cannot finish; P1 = a
wrong value, a dead end or a lost step; P2 = friction or wording.

## Findings

| # | Journey | Step | Problem | Type | Sev | Evidence (file:line / URL) | Proposed fix | Session |
|---|---|---|---|---|---|---|---|---|
| 1 | Consultations: specialty -> doctor -> slot -> pay | slot booking on the web | A visit with a duration cannot be booked; the step fails with 400 after the patient has picked a slot | dead end | P0 | `patient-web/components-next/booking-flow.tsx:164`; `patient-web/app/api/appointments/book/route.ts:8-28` (`.strict()` without `duration_minutes`); `docs/qa/findings/product-sense.md` PS-P0-2 | Accept `duration_minutes` in the route, or stop sending it | patient-web |
| 2 | Consultations: doctor page | open a doctor's booking screen | The page returns 503 "We can't load this page right now" although the backend answers 200 | dead end | P1 | `patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:96` (a function passed to a client component); `docs/qa/findings/web-sweep-dynamic.md` row 1 | Pass serialisable props only; isolate the prop first | patient-web |
| 3 | Map and consultations: public listing | choose a doctor from the map | Test and junk providers are visible to patients, in Arabic and English ("Sandbox Doctor Riyadh", "لنبتبت") | illogical | P0 | `https://nabd.plus/ar/map`, `https://nabd.plus/en/map`; `docs/qa/findings/product-sense.md` PS-P0-1 | Unpublish on production (owner decision and admin action); block test-name patterns from public approval | admin |
| 4 | Labs and radiology: browse -> book -> pay | the price shown | The lab's and the centre's own price is not shown or charged; the catalogue price is used | wrong value | P1 | `backend/src/modules/labs/labs.service.ts` `book()`; `docs/qa/findings/price-vs-checkout.md` lab row; `docs/qa/findings/provider-services.md` gap 1 (fix #2088 not yet effective for prices) | Apply the provider's own price in the booking and in the list | backend |
| 5 | Nursing: browse -> book -> pay | the price shown | The nurse's own price (150 and 120 set at registration) is not shown or charged; 100 is | wrong value | P1 | `backend/src/modules/home-care/home-care-compat.module.ts:104-105`; `docs/qa/findings/price-vs-checkout.md` nurse row | As row 4 | backend |
| 6 | Labs and nursing: filters | "home" and "insurance" filters | The server ignores both filters, so the list does not match what the patient chose | illogical | P1 | `docs/qa/findings/product-sense.md` PS-P1-2 (provider-services gaps 4, 5, 9) | Filter on the server, or on the client with the per-provider fields | backend |
| 7 | Diagnostics: browse | reachable tests | Only 21 of 120 lab tests can be reached from `/diagnostics` | dead end | P1 | `docs/qa/findings/catalogue-and-entry-points.md` CAT-1 | Link the full catalogue | patient-web |
| 8 | Insurance: add the card | "Your share" and "Maximum per item" | Both values are sent and then dropped by the schema, so the card is saved without them and estimates are wrong | lost data | P1 | `backend/src/schemas/patient-profile.schema.ts:81-100`; `backend/src/modules/insurance-engine/insurance-engine.module.ts:299-306`; `docs/qa/findings/web-patient.md` row for `/en/insurance/add-policy` | Add the copay fields to the sub-schema | backend |
| 9 | Insurance: add the card | save path | Two writers of the same field use different shapes (the engine and `savePolicy`) | illogical | P2 | `backend/src/modules/insurance/insurance.module.ts:359`; `docs/qa/findings/web-patient.md` | One save path, one shape | backend |
| 10 | Insurance: use it at booking | copay on the provider's decision | The card's copay cap is ignored; the patient pays the percentage with no cap | wrong value | P1 | `backend/src/modules/insurance-engine/insurance-engine.module.ts:643-653`; `docs/qa/findings/insurance-copay.md` INS-CAP-1 | `min(copay, copay_cap_sar)` in the decide path | backend |
| 11 | Orders and refunds (admin console) | refund after a late cancel | The admin's "full" refund returns 100 % after a 50 % cancellation; the penalty is lost. The admin must decide the rule | wrong value | P1 | `backend/src/modules/admin/enterprise/orders-console.service.ts:369`; `backend/src/modules/care/appointments.service.ts:556-575`; `docs/qa/findings/refund-penalty.md` REF-PEN-1 | Owner decides; then the console says which rule it applies | admin (decision first) |
| 12 | Prescription upload -> pharmacy offers | upload | Any string is accepted as the image; a prescription with no image reaches pharmacies and admin | dead end | P1 | `backend/src/modules/prescriptions/prescriptions.service.ts` `uploadByPatient`; `backend/src/modules/prescriptions/prescriptions.dto.ts:53-56`; `docs/qa/findings/prescription-upload.md` RX-1 | Check the stored object belongs to the patient and passed the scan | backend |
| 13 | Provider: register -> approval | admin rejects an applicant | A rejected applicant stays active and can sign in to the provider app | illogical | P1 (candidate) | `backend/src/modules/provider/services/provider-admin.service.ts:207-212`; `backend/src/modules/provider/provider.controllers.ts:32`; `docs/qa/findings/provider-onboarding.md` V-07 | Set the user inactive on reject; refuse the login for rejected accounts | backend |
| 14 | Provider: post a job | hospital posts a job | A hospital signed in through the provider app gets 403 on posting a job | dead end | P1 | `backend/src/modules/recruitment/recruitment.module.ts:322`; `docs/qa/findings/jobs-inbox.md` | Allow the provider role for facility accounts | backend |
| 15 | Guest job post -> admin publish | publish step | A guest's job draft cannot be published; the admin's update returns 404 and the admin web has no recruitment page | dead end | P1 | `backend/src/modules/recruitment/recruitment.module.ts:151-179`, `:327-334`, `:168`; `docs/qa/findings/b2b-map-jobs.md` | A publish route for guest drafts, and an admin screen for it | backend, then admin |
| 16 | Admin: system logs | open the logs page | The page returns 404; the controller is not registered | dead end | P1 | `backend/src/modules/admin/admin.module.ts:126`; `admin/src/pages/admin/logs.tsx:38`; `docs/qa/findings/admin-sweep.md` | Register the controller in the module that is used | backend |
| 17 | Web cart and checkout | add to cart, then checkout | Not walked. The earlier blocker (hydration on /en/c) was a local setup error (`docs/qa/findings/web-patient.md` correction). The next row to walk is `/ar/cart/checkout` | not yet walked | - | - | - | patient-web |

## Not yet walked (each needs its own walk, Arabic and English, web and app)

- Sign-up, sign-in and guest: not walked in this pass.
- Pharmacy: search -> cart -> checkout -> payment -> offers -> tracking -> receipt -> cancel and refund: partly covered by
  the earlier sweep (`docs/qa/SCENARIOS.md`); the end-to-end UX walk is not done.
- Labs, radiology and nursing: "notify me" with no provider, book, pay, results: not walked.
- Consultations after payment: call and chat, outcomes, My appointments (prescription order, referral booking, sick leave): not walked.
- Family members, orders and results, support, settings (language and dark mode): not walked.
- Provider side from registration to payout (prices, receiving a booking, accept, complete, upload result, payout)
  and admin approval: partly covered by `docs/qa/findings/provider-*.md`; the UX walk is not done.
- Mobile app (patient and provider): every row above is a web or API observation. Native screens need a device or Maestro
  runner (not available in this session).

## Next steps

1. Owner decisions needed for rows 3 (unpublish on production), 11 (refund rule) and 10 (copay cap rule) before their fixes.
2. Backend session: rows 4, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16.
3. Patient-web session: rows 1, 2, 7 and the walk of the cart and checkout.
4. Admin session: rows 3 and 11 after the decisions; row 15 admin screen.
5. Walk the not-yet-walked journeys in the order the lead gave, one journey per pass, recording each step here.
