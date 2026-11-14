# Provider journeys: second fix group (races, privacy, suspension)

Register ids are those of `docs/qa/provider-journeys.md` (PR #2272). This file only records what this group changes.

**How it was checked.** The scenario matrix needs a running stack (MongoDB replica set, workers, push). None is available in this environment, so the matrix cells were **not** re-run live; each fix below is proven by a unit test that fails without the fix. The live gate in CI is the first place the journeys run.

| Id | Defect | Fix | Test | Cell |
|---|---|---|---|---|
| R7 | lab and radiology provider inbox returned the patient's phone and exact address before acceptance | `withholdLegacyBeforeAcceptance` in `provider-job-privacy.ts`; lab `NEW_REQUEST`, radiology `NEW_REQUEST`/`PENDING` show the district or city only | `provider-job-privacy.legacy.spec.ts` (3) | lab, radiology: receive → PASS by test |
| R8 | a booking with a facility id that is no provider account notified nobody | `notifyBookingProvider` takes the first field that resolves to a real account | `notify-booking-provider-resolve.spec.ts` | lab receive → PASS by test |
| X2 | a retried lab `upload-report` with the same stored file pushed a second report and told the patient twice | same `report_storage_object_id` returns the booking unchanged | `labs-upload-report-retry.spec.ts` | lab complete → PASS by test |
| X3 | `finish()` rewrote the summary of a visit that was already completed or cancelled before refusing | completed: reported as done, no write; cancelled, missed or moved: refused before any write | `appointments-finish-idempotent.spec.ts` (5) | doctor complete → PASS by test |
| X4 (staff) | a facility staff member suspended by the owner kept working: login reads `active`, the route set only `suspended` | `active` follows `suspended`; suspending ends open sessions | `hospital-staff.service.spec.ts` | suspension → PASS by test |

**Still open from the register (not in this group):** R4 live lists and badge; R6 expiry of unanswered bookings; S1 losers of a broadcast not told; S2 radiology and nursing ASAP create lab bookings; S3 insurance rest; X4 open orders of a suspended provider; X7 error handling on the remaining screens; W1b, W2, W6; D2 rest. FOR F: D1, D5, S4, X5, X6.
